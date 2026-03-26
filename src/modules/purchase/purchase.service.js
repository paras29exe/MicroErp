import prisma from "../../config/db.js";
import { increaseStock, decreaseStock } from "../inventory/inventory.service.js";
import { ApiError } from "../../utils/response.js";

export const createPurchase = async ({ vendorId, purchaseDate, paymentStatus, items }) => {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.findUnique({
            where: { id: vendorId },
            select: { id: true },
        });

        if (!vendor) {
            throw new ApiError(400, `Vendor with ID ${vendorId} does not exist`);
        }

        const uniqueProductIds = [...new Set(items.map((item) => item.productId))];
        const existingProducts = await tx.product.findMany({
            where: { id: { in: uniqueProductIds } },
            select: { id: true },
        });

        const existingProductIds = new Set(existingProducts.map((product) => product.id));
        const missingProductIds = uniqueProductIds.filter((id) => !existingProductIds.has(id));

        if (missingProductIds.length > 0) {
            throw new ApiError(400, `Invalid product ID(s): ${missingProductIds.join(", ")}`);
        }

        const purchase = await tx.purchase.create({
            data: {
                vendorId,
                totalAmount,
                purchaseDate,
                paymentStatus,
            },
        });

        await tx.purchaseItem.createMany({
            data: items.map((item) => ({
                purchaseId: purchase.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            })),
        });
        
        // Aggregate quantity and value per product to maintain weighted average valuation.
        const aggregatesByProductId = new Map();
        for (const item of items) {
            const previous = aggregatesByProductId.get(item.productId) || { quantity: 0, totalValue: 0 };
            aggregatesByProductId.set(item.productId, {
                quantity: previous.quantity + item.quantity,
                totalValue: previous.totalValue + item.quantity * item.price,
            });
        }

        for (const [productId, aggregate] of aggregatesByProductId) {
            const unitCost = aggregate.quantity > 0 ? aggregate.totalValue / aggregate.quantity : 0;
            await increaseStock(productId, aggregate.quantity, "PURCHASE", `PUR-${purchase.id}`, tx, {
                unitCost,
            });
        }
        
        // find the created purchase with its associated data
        return tx.purchase.findUnique({
            where: { id: purchase.id },
            include: {
                vendor: true,
                items: { include: { product: true } },
            },
        });
    }, { maxWait: 10000, timeout: 20000 });
};

export const getPurchases = async ({
    skip,
    take,
    search,
    vendorName,
    vendorPhone,
    productName,
    paymentStatus,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    sortBy = "purchaseDate",
    sortOrder = "desc",
}) => {
    const andFilters = [];

    if (paymentStatus) {
        andFilters.push({ paymentStatus });
    }

    if (startDate || endDate) {
        andFilters.push({
            purchaseDate: {
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

    if (vendorName) {
        andFilters.push({
            vendor: {
                name: { contains: vendorName, mode: "insensitive" },
            },
        });
    }

    if (vendorPhone) {
        andFilters.push({
            vendor: {
                phone: { contains: vendorPhone, mode: "insensitive" },
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

    if (search) {
        const orFilters = [
            {
                vendor: {
                    name: { contains: search, mode: "insensitive" },
                },
            },
            {
                vendor: {
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

    const orderBy =
        sortBy === "vendorName"
            ? { vendor: { name: sortOrder } }
            : { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
        prisma.purchase.findMany({
            where,
            skip,
            take,
            orderBy,
            include: {
                vendor: true,
                items: { include: { product: true } },
            },
        }),
        prisma.purchase.count({ where }),
    ]);

    return { data, total };
};

export const getPurchaseById = async (id) => {
    return prisma.purchase.findUnique({
        where: { id },
        include: {
            vendor: true,
            items: { include: { product: true } },
        },
    });
};

export const updatePaymentStatus = async (id, paymentStatus) => {
    return prisma.purchase.update({
        where: { id },
        data: { paymentStatus },
    });
};

export const deletePurchase = async (id) => {
    const purchase = await prisma.purchase.findUnique({
        where: { id },
        include: { items: true },
    });

    if (!purchase) return null;
    await prisma.$transaction(async (tx) => {
        for (const item of purchase.items) {
            await decreaseStock(item.productId, item.quantity, "PURCHASE", `PUR-${id}`, tx);
        }

        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await tx.purchase.delete({ where: { id } });
    });

    return purchase;
};
