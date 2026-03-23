import prisma from "../../config/db.js";
import { decreaseStock } from "../inventory/inventory.service.js";
import { ApiError } from "../../utils/response.js";

export const createSale = async ({ customerId, saleDate, items }) => {
    const totalSellingAmount = items.reduce((sum, item) => sum + item.quantity * item.sellingPrice, 0);

    return prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findUnique({
            where: { id: customerId },
            select: { id: true },
        });

        if (!customer) {
            throw new ApiError(400, `Customer with ID ${customerId} does not exist`);
        }

        const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
        const products = await tx.product.findMany({
            where: { id: { in: uniqueProductIds } },
            select: { id: true, category: true, costPrice: true },
        });

        const existingProductIds = new Set(products.map((product) => product.id));
        const missingProductIds = uniqueProductIds.filter((id) => !existingProductIds.has(id));

        if (missingProductIds.length > 0) {
            throw new ApiError(400, `Invalid product ID(s): ${missingProductIds.join(", ")}`);
        }

        const nonFinishedProducts = products.filter((product) => product.category !== "finished");
        if (nonFinishedProducts.length > 0) {
            throw new ApiError(400, "Only finished products can be sold");
        }

        const inventories = await tx.inventory.findMany({
            where: { productId: { in: uniqueProductIds } },
            select: { productId: true, stockQuantity: true },
        });

        const stockByProductId = new Map(inventories.map((inv) => [inv.productId, inv.stockQuantity]));

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
            const product = products.find((p) => p.id === item.productId);
            const costPrice = product.costPrice;
            const profit = (item.sellingPrice - costPrice) * item.quantity;

            totalCost += costPrice * item.quantity;
            totalProfit += profit;

            return {
                productId: item.productId,
                quantity: item.quantity,
                sellingPrice: item.sellingPrice,
                costPrice,
                profit,
            };
        });

        const sale = await tx.sale.create({
            data: {
                customerId,
                totalAmount: totalSellingAmount,
                sellingPrice: totalSellingAmount,
                costPrice: totalCost,
                profit: totalProfit,
                saleDate,
            },
        });

        await tx.saleItem.createMany({
            data: saleItemsData.map((item) => ({
                saleId: sale.id,
                productId: item.productId,
                quantity: item.quantity,
                sellingPrice: item.sellingPrice,
                costPrice: item.costPrice,
                profit: item.profit,
            })),
        });

        for (const [productId, quantity] of quantityByProductId) {
            await decreaseStock(productId, quantity, "SALE", `SALE-${sale.id}`, tx);
        }

        return tx.sale.findUnique({
            where: { id: sale.id },
            include: {
                customer: true,
                items: { include: { product: true } },
            },
        });
    }, { maxWait: 10000, timeout: 20000 });
};

export const getSales = async ({ skip, take, productId, startDate, endDate, profitFilter }) => {
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

    if (startDate || endDate) {
        andFilters.push({
            saleDate: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        });
    }

    if (profitFilter === "positive") {
        andFilters.push({ profit: { gt: 0 } });
    } else if (profitFilter === "negative") {
        andFilters.push({ profit: { lt: 0 } });
    }

    const where = andFilters.length > 0 ? { AND: andFilters } : undefined;

    const [data, total] = await Promise.all([
        prisma.sale.findMany({
            where,
            skip,
            take,
            orderBy: { saleDate: "desc" },
            include: {
                customer: true,
                purchase: true,
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