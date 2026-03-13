import prisma from "../../config/db.js";

export const createPurchase = async ({ vendorId, purchaseDate, paymentStatus, items }) => {
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    return prisma.$transaction(async (tx) => {
        const purchase = await tx.purchase.create({
            data: {
                vendorId,
                totalAmount,
                purchaseDate,
                paymentStatus,
            },
        });

        for (const item of items) {
            await tx.purchaseItem.create({
                data: {
                    purchaseId: purchase.id,
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.price,
                },
            });

            // await tx.product.update({
            //     where: { id: item.productId },
            //     data: { stock: { increment: item.quantity } },
            // });
        }

        return tx.purchase.findUnique({
            where: { id: purchase.id },
            include: {
                vendor: true,
                items: { include: { product: true } },
            },
        });
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

    await prisma.$transaction(async (tx) => {
        for (const item of purchase.items) {
            await tx.product.update({
                where: { id: item.productId },
                data: { stock: { decrement: item.quantity } },
            });
        }

        await tx.purchaseItem.deleteMany({ where: { purchaseId: id } });
        await tx.purchase.delete({ where: { id } });
    });

    return purchase;
};
