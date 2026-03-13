import prisma from "../../config/db.js";
import { increaseStock, decreaseStock } from "../inventory/inventory.service.js";

export const createPurchase = async ({ vendorId, purchaseDate, paymentStatus, items }) => {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    const purchase = await prisma.purchase.create({
        data: {
            vendorId,
            totalAmount,
            purchaseDate,
            paymentStatus,
        },
    });

    for (const item of items) {
        await prisma.purchaseItem.create({
            data: {
                purchaseId: purchase.id,
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
            },
        });

        await increaseStock(item.productId, item.quantity, "PURCHASE", `PUR-${purchase.id}`);
    }

    return prisma.purchase.findUnique({
        where: { id: purchase.id },
        include: {
            vendor: true,
            items: { include: { product: true } },
        },
    });
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

    for (const item of purchase.items) {
        await decreaseStock(item.productId, item.quantity, "PURCHASE", `PUR-${id}`);
    }

    await prisma.purchaseItem.deleteMany({ where: { purchaseId: id } });
    await prisma.purchase.delete({ where: { id } });

    return purchase;
};
