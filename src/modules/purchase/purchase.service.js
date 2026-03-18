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
        
        // in case of duplicate product IDs, sum the quantities
        const quantityByProductId = new Map();
        for (const item of items) {
            const previous = quantityByProductId.get(item.productId) || 0;
            quantityByProductId.set(item.productId, previous + item.quantity);
        }

        for (const [productId, quantity] of quantityByProductId) {
            await increaseStock(productId, quantity, "PURCHASE", `PUR-${purchase.id}`, tx);
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

export const getPurchases = async ({ skip, take }) => {
    const [data, total] = await Promise.all([
        prisma.purchase.findMany({
            skip,
            take,
            orderBy: { purchaseDate: "desc" },
            include: {
                vendor: true,
                items: { include: { product: true } },
            },
        }),
        prisma.purchase.count(),
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
