import prisma from "../../config/db.js";
import { ApiError } from "../../utils/response.js";

const roundTo = (value, precision = 6) => {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
};

export const getInventory = async ({
    search,
    lowStock,
    category,
    stockStatus,
    startDate,
    endDate,
    page,
    limit,
    sortBy = "updatedAt",
    sortOrder = "desc",
}) => {
    const where = {
        ...(search || category
            ? {
                  product: {
                      ...(search && {
                          name: { contains: search, mode: "insensitive" },
                      }),
                      ...(category && { category }),
                  },
              }
            : {}),
        ...(startDate || endDate
            ? {
                  updatedAt: {
                      ...(startDate && { gte: startDate }),
                      ...(endDate && { lte: endDate }),
                  },
              }
            : {}),
        ...(stockStatus === "out" ? { stockQuantity: 0 } : {}),
        ...(stockStatus === "in" ? { stockQuantity: { gt: 0 } } : {}),
    };

    const orderBy =
        sortBy === "productName"
            ? { product: { name: sortOrder } }
            : { [sortBy]: sortOrder };

    const requiresLowStockComparison = lowStock || stockStatus === "low";

    if (!requiresLowStockComparison) {
        const skip = (page - 1) * limit;

        const [rows, total] = await Promise.all([
            prisma.inventory.findMany({
                where,
                skip,
                take: limit,
                orderBy,
                include: {
                    product: {
                        select: { id: true, name: true, category: true },
                    },
                },
            }),
            prisma.inventory.count({ where }),
        ]);

        return { data: rows, total };
    }

    const rows = await prisma.inventory.findMany({
        where,
        orderBy,
        include: {
            product: {
                select: { id: true, name: true, category: true },
            },
        },
    });

    const filteredRows = rows.filter((row) => row.stockQuantity <= row.reorderLevel);
    const total = filteredRows.length;
    const start = (page - 1) * limit;

    return { data: filteredRows.slice(start, start + limit), total };
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
        avgCost: product.inventory.avgCost,
        stockValue: product.inventory.stockValue,
    };
};

export const getLowStockProducts = async () => {
    const inventoryRows = await prisma.inventory.findMany({
        include: {
            product: {
                select: { id: true, name: true },
            },
        },
    });

    return inventoryRows
        .filter((row) => row.stockQuantity <= row.reorderLevel)
        .map((row) => ({
            productId: row.product.id,
            productName: row.product.name,
            stockQuantity: row.stockQuantity,
            reorderLevel: row.reorderLevel,
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
            data: {
                productId,
                stockQuantity: 0,
                reorderLevel: product.restockLevel,
                avgCost: 0,
                stockValue: 0,
            },
        });
    }

    const adjustment = adjustmentType === "increase" ? quantity : -quantity;

    if (adjustment < 0 && inventory.stockQuantity < Math.abs(adjustment)) {
        throw new ApiError(400, "Insufficient stock for adjustment");
    }

    await increaseStock(
        productId,
        adjustment,
        "ADJUSTMENT",
        null,
        null,
        { reason }
    );

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
            data: { productId, reorderLevel, avgCost: 0, stockValue: 0 },
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
export const increaseStock = async (
    productId,
    quantity,
    transactionType,
    referenceId,
    tx = null,
    options = {}
) => {
    const db = tx || prisma;
    const { unitCost: inputUnitCost, reason } = options;

    let inventory = await db.inventory.findUnique({ where: { productId } });
    if (!inventory) {
        const product = await db.product.findUnique({ where: { id: productId } });
        if (!product) {
            throw new ApiError(400, `Product with ID ${productId} does not exist`);
        }
        inventory = await db.inventory.create({
            data: {
                productId,
                stockQuantity: 0,
                reorderLevel: product.restockLevel,
                avgCost: 0,
                stockValue: 0,
            },
        });
    }

    const previousQuantity = inventory.stockQuantity;
    const previousValue = inventory.stockValue;
    const quantityDelta = Number(quantity);

    if (quantityDelta === 0) {
        return;
    }

    if (quantityDelta < 0 && previousQuantity < Math.abs(quantityDelta)) {
        throw new ApiError(400, `Insufficient stock for productId ${productId}`);
    }

    const effectiveUnitCost =
        inputUnitCost !== undefined && inputUnitCost !== null
            ? Number(inputUnitCost)
            : Number(inventory.avgCost || 0);

    if (!Number.isFinite(effectiveUnitCost) || effectiveUnitCost < 0) {
        throw new ApiError(400, "Invalid unit cost for inventory transaction");
    }

    const totalValueDelta = roundTo(quantityDelta * effectiveUnitCost);
    const nextQuantity = previousQuantity + quantityDelta;

    let nextValue = roundTo(previousValue + totalValueDelta);
    if (nextQuantity === 0) {
        nextValue = 0;
    }

    if (nextValue < 0) {
        nextValue = 0;
    }

    const nextAvgCost = nextQuantity > 0 ? roundTo(nextValue / nextQuantity) : 0;

    await db.inventory.update({
        where: { productId },
        data: {
            stockQuantity: nextQuantity,
            stockValue: nextValue,
            avgCost: nextAvgCost,
        },
    });

    await db.inventoryTransaction.create({
        data: {
            productId,
            transactionType,
            quantity: quantityDelta,
            unitCost: roundTo(effectiveUnitCost),
            totalValue: totalValueDelta,
            stockAfter: nextQuantity,
            stockValueAfter: nextValue,
            stockAvgCostAfter: nextAvgCost,
            referenceId,
            reason,
        },
    });
};

export const decreaseStock = async (
    productId,
    quantity,
    transactionType,
    referenceId,
    tx = null,
    options = {}
) => {
    await increaseStock(productId, -quantity, transactionType, referenceId, tx, options);
};
