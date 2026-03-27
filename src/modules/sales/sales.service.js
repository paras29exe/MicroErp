import prisma from "../../config/db.js";
import { decreaseStock, increaseStock } from "../inventory/inventory.service.js";
import { ApiError } from "../../utils/response.js";

export const createSale = async ({ customerId, saleDate, items }) => {
    const totalSellingAmount = items.reduce((sum, item) => sum + item.quantity * item.unitSellingPrice, 0);

    return prisma.$transaction(async (tx) => {
        const uniqueProductIds = [...new Set(items.map((item) => item.productId))];

        const [customer, products, inventories] = await Promise.all([
            tx.customer.findFirst({
                where: { id: customerId, isDeleted: false },
                select: { id: true },
            }),
            tx.product.findMany({
                where: { id: { in: uniqueProductIds }, isDeleted: false },
                select: { id: true, category: true },
            }),
            tx.inventory.findMany({
                where: { productId: { in: uniqueProductIds } },
                select: { productId: true, stockQuantity: true, avgCost: true },
            }),
        ]);

        if (!customer) {
            throw new ApiError(400, `Customer with ID ${customerId} does not exist`);
        }

        const existingProductIds = new Set(products.map((product) => product.id));
        const missingProductIds = uniqueProductIds.filter((id) => !existingProductIds.has(id));

        if (missingProductIds.length > 0) {
            throw new ApiError(400, `Invalid product ID(s): ${missingProductIds.join(", ")}`);
        }

        const nonFinishedProducts = products.filter((product) => product.category !== "finished");
        if (nonFinishedProducts.length > 0) {
            throw new ApiError(400, "Only finished products can be sold");
        }

        const stockByProductId = new Map(inventories.map((inv) => [inv.productId, inv.stockQuantity]));
        const avgCostByProductId = new Map(inventories.map((inv) => [inv.productId, inv.avgCost || 0]));

        const quantityByProductId = new Map();
        for (const item of items) {
            const prev = quantityByProductId.get(item.productId) || 0;
            quantityByProductId.set(item.productId, prev + item.quantity);
        }

        const insufficientStocks = [];
        for (const [productId, required] of quantityByProductId) {
            const available = stockByProductId.get(productId) || 0;
            if (available < required) {
                insufficientStocks.push({ productId, required, available });
            }
        }

        if (insufficientStocks.length > 0) {
            const details = insufficientStocks
                .map((item) => `productId ${item.productId}: required ${item.required}, available ${item.available}`)
                .join("; ");
            throw new ApiError(400, `Insufficient stock. ${details}`);
        }

        let totalCost = 0;
        let totalProfit = 0;

        const saleItemsData = items.map((item) => {
            const unitCost = avgCostByProductId.get(item.productId) || 0;
            const lineProfit = (item.unitSellingPrice - unitCost) * item.quantity;

            totalCost += unitCost * item.quantity;
            totalProfit += lineProfit;

            return {
                productId: item.productId,
                quantity: item.quantity,
                unitSellingPrice: item.unitSellingPrice,
                unitCost,
                profit: lineProfit,
            };
        });

        const sale = await tx.sale.create({
            data: {
                customerId,
                totalAmount: totalSellingAmount,
                grossSales: totalSellingAmount,
                totalCogs: totalCost,
                grossProfit: totalProfit,
                saleDate,
            },
        });

        await tx.saleItem.createMany({
            data: saleItemsData.map((item) => ({
                saleId: sale.id,
                productId: item.productId,
                quantity: item.quantity,
                unitSellingPrice: item.unitSellingPrice,
                unitCost: item.unitCost,
                profit: item.profit,
            })),
        });

        await Promise.all(
            [...quantityByProductId].map(([productId, quantity]) =>
                decreaseStock(productId, quantity, "SALE", `SALE-${sale.id}`, tx, {
                    unitCost: avgCostByProductId.get(productId) || 0,
                })
            )
        );

        return tx.sale.findUnique({
            where: { id: sale.id },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
    }, { maxWait: 10000, timeout: 20000 });
};

export const getSales = async ({
    skip,
    take,
    productId,
    productName,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    profitFilter,
    search,
    customerName,
    customerPhone,
    sortBy = "saleDate",
    sortOrder = "desc",
}) => {
    const andFilters = [];

    if (productId !== undefined) {
        andFilters.push({
            items: {
                some: {
                    productId,
                },
            },
        });
    }

    if (productName) {
        andFilters.push({
            items: {
                some: {
                    product: {
                        name: { contains: productName, mode: "insensitive" },
                    },
                },
            },
        });
    }

    if (startDate || endDate) {
        andFilters.push({
            saleDate: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        });
    }

    if (minAmount !== undefined || maxAmount !== undefined) {
        andFilters.push({
            totalAmount: {
                ...(minAmount !== undefined && { gte: minAmount }),
                ...(maxAmount !== undefined && { lte: maxAmount }),
            },
        });
    }

    if (profitFilter === "positive") {
        andFilters.push({ grossProfit: { gt: 0 } });
    } else if (profitFilter === "negative") {
        andFilters.push({ grossProfit: { lt: 0 } });
    }

    if (customerName) {
        andFilters.push({
            customer: {
                name: { contains: customerName, mode: "insensitive" },
            },
        });
    }

    if (customerPhone) {
        andFilters.push({
            customer: {
                phone: { contains: customerPhone, mode: "insensitive" },
            },
        });
    }

    if (search) {
        const orFilters = [
            {
                customer: {
                    name: { contains: search, mode: "insensitive" },
                },
            },
            {
                customer: {
                    phone: { contains: search, mode: "insensitive" },
                },
            },
            {
                items: {
                    some: {
                        product: {
                            name: { contains: search, mode: "insensitive" },
                        },
                    },
                },
            },
        ];

        const numericSearch = Number.parseInt(search, 10);
        if (!Number.isNaN(numericSearch) && String(numericSearch) === search.trim()) {
            orFilters.push({ id: numericSearch });
        }

        andFilters.push({ OR: orFilters });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : undefined;

    let orderBy;
    if (sortBy === "customerName") {
        orderBy = [{ customer: { name: sortOrder } }, { id: "desc" }];
    } else {
        orderBy = [{ [sortBy]: sortOrder }, { id: "desc" }];
    }

    const [data, total] = await Promise.all([
        prisma.sale.findMany({
            where,
            skip,
            take,
            orderBy,
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        }),
        prisma.sale.count({ where }),
    ]);

    return { data, total };
};

export const getSaleById = async (id) => {
    return prisma.sale.findUnique({
        where: { id },
        include: {
            customer: true,
            items: { include: { product: true } },
        },
    });
};

export const removeSale = async (saleId) => {
    return prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
            where: { id: saleId },
            include: {
                items: {
                    select: {
                        productId: true,
                        quantity: true,
                        unitCost: true,
                    },
                },
            },
        });

        if (!sale) {
            throw new ApiError(404, "Sale not found");
        }

        const restoreByProduct = new Map();
        for (const item of sale.items) {
            const previous = restoreByProduct.get(item.productId) || { quantity: 0, unitCost: 0 };
            const nextQuantity = previous.quantity + item.quantity;
            const weightedCost =
                nextQuantity > 0
                    ? ((previous.unitCost * previous.quantity) + (item.unitCost * item.quantity)) / nextQuantity
                    : 0;

            restoreByProduct.set(item.productId, {
                quantity: nextQuantity,
                unitCost: weightedCost,
            });
        }

        await Promise.all(
            [...restoreByProduct.entries()].map(([productId, stock]) =>
                increaseStock(
                    productId,
                    stock.quantity,
                    "SALE_DELETE",
                    `SALE-${saleId}`,
                    tx,
                    {
                        unitCost: stock.unitCost,
                        reason: `Sale ${saleId} deleted - stock restored`,
                    }
                )
            )
        );

        await tx.saleItem.deleteMany({ where: { saleId } });
        await tx.sale.delete({ where: { id: saleId } });

        return { id: saleId };
    }, { maxWait: 10000, timeout: 20000 });
};