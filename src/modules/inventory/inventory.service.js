import prisma from "../../config/db.js";
import { ApiError } from "../../utils/response.js";

export const getInventory = async ({ search, lowStock, page, limit }) => {
    let products = await prisma.product.findMany({
        include: { inventory: true },
        orderBy: { createdAt: "desc" },
    });

    products = products.filter((p) => p.inventory); // only with inventory

    if (search) {
        products = products.filter((p) =>
            p.name.toLowerCase().includes(search.toLowerCase())
        );
    }

    if (lowStock) {
        products = products.filter(
            (p) => p.inventory.stockQuantity <= p.inventory.reorderLevel
        );
    }

    const total = products.length;
    const start = (page - 1) * limit;
    const paginated = products.slice(start, start + limit);

    return { data: paginated, total };
};

export const getProductInventory = async (productId) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    if (!product || !product.inventory) {
        throw new ApiError(404, "Inventory not found");
    }

    return {
        productId: product.id,
        productName: product.name,
        stockQuantity: product.inventory.stockQuantity,
        reorderLevel: product.inventory.reorderLevel,
    };
};

export const getLowStockProducts = async () => {
    const products = await prisma.product.findMany({
        include: { inventory: true },
    });

    return products
        .filter((p) => p.inventory && p.inventory.stockQuantity <= p.inventory.reorderLevel)
        .map((p) => ({
            productId: p.id,
            productName: p.name,
            stockQuantity: p.inventory.stockQuantity,
            reorderLevel: p.inventory.reorderLevel,
        }));
};

export const adjustStock = async ({ productId, adjustmentType, quantity, reason }) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    let inventory = product.inventory;
    if (!inventory) {
        inventory = await prisma.inventory.create({
            data: { productId, stockQuantity: 0, reorderLevel: product.restockLevel },
        });
    }

    const adjustment = adjustmentType === "increase" ? quantity : -quantity;

    await prisma.$transaction(async (tx) => {
        await tx.inventory.update({
            where: { productId },
            data: { stockQuantity: { increment: adjustment } },
        });

        await tx.inventoryTransaction.create({
            data: {
                productId,
                transactionType: "ADJUSTMENT",
                quantity: adjustment,
                reason,
            },
        });
    });

    return { message: "Stock adjusted successfully" };
};

export const getInventorySummary = async () => {
    const products = await prisma.product.findMany({
        include: { inventory: true },
    });

    const totalProducts = products.filter((p) => p.inventory).length;
    const lowStockProducts = products.filter(
        (p) => p.inventory && p.inventory.stockQuantity <= p.inventory.reorderLevel
    ).length;
    const outOfStockProducts = products.filter(
        (p) => p.inventory && p.inventory.stockQuantity === 0
    ).length;

    return { totalProducts, lowStockProducts, outOfStockProducts };
};

export const updateReorderLevel = async (productId, reorderLevel) => {
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { inventory: true },
    });

    if (!product) {
        throw new ApiError(404, "Product not found");
    }

    if (!product.inventory) {
        await prisma.inventory.create({
            data: { productId, reorderLevel },
        });
    } else {
        await prisma.inventory.update({
            where: { productId },
            data: { reorderLevel },
        });
    }

    return { message: "Reorder level updated" };
};

// Internal functions for other modules
export const increaseStock = async (productId, quantity, transactionType, referenceId, tx = null) => {
    const db = tx || prisma;

    let inventory = await db.inventory.findUnique({ where: { productId } });
    if (!inventory) {
        const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) {
            throw new ApiError(400, `Product with ID ${productId} does not exist`);
        }
        inventory = await db.inventory.create({
            data: { productId, stockQuantity: 0, reorderLevel: product.restockLevel },
        });
    }

    await db.inventory.update({
        where: { productId },
        data: { stockQuantity: { increment: quantity } },
    });

    await db.inventoryTransaction.create({
        data: {
            productId,
            transactionType,
            quantity,
            referenceId,
        },
    });
};

export const decreaseStock = async (productId, quantity, transactionType, referenceId, tx = null) => {
    await increaseStock(productId, -quantity, transactionType, referenceId, tx);
};
