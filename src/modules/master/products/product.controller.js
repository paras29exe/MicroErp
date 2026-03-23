import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const VALID_CATEGORIES = ["raw", "wip", "finished"];

export const addProduct = async (req, res, next) => {
    try {
        const { name, description, category, restockLevel, costPrice } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            throw new ApiError(400, "Product name is required");
        }

        const normalizedName = name.trim();

        if (costPrice !== undefined && (typeof costPrice !== "number" || costPrice < 0)) {
            throw new ApiError(400, "costPrice must be a non-negative number");
        }


        const duplicateProduct = await prisma.product.findFirst({
            where: {
                name: {
                    equals: normalizedName,
                    mode: "insensitive",
                },
            },
            select: { id: true },
        });

        if (duplicateProduct) {
            throw new ApiError(409, "Product with this name already exists");
        }

        if (!category) throw new ApiError(400, "Category is required");
        if (!VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        if (restockLevel !== undefined) {
            if (typeof restockLevel !== "number" || restockLevel < 0) {
                throw new ApiError(400, "Restock level must be a non-negative number");
            }
        } else {
            throw new ApiError(400, "Restock level is required");
        }

        if (costPrice !== undefined && (typeof costPrice !== "number" || costPrice < 0)) {
            throw new ApiError(400, "costPrice must be a non-negative number");
        }

        const data = await prisma.product.create({
            data: {
                name: normalizedName,
                description: description || null,
                category,
                restockLevel: restockLevel,
                costPrice: costPrice !== undefined ? costPrice : 0,
            },
        });

        return res.status(201).json(new ApiResponse(201, "Product added successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getProducts = async (req, res, next) => {
    try {
        const { category } = req.query;

        if (category && !VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        const data = await prisma.product.findMany({
            where: category ? { category } : undefined,
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json(new ApiResponse(200, "Products retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const data = await prisma.product.findUnique({ where: { id } });
        if (!data) throw new ApiError(404, "Product not found");

        return res.status(200).json(new ApiResponse(200, "Product retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const editProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, "Product not found");

        const { name, description, category, restockLevel, costPrice } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            throw new ApiError(400, "Product name cannot be empty");
        }

        if (costPrice !== undefined && (typeof costPrice !== "number" || costPrice < 0)) {
            throw new ApiError(400, "costPrice must be a non-negative number");
        }

        const normalizedName = name !== undefined ? name.trim() : undefined;

        if (normalizedName !== undefined) {
            const duplicateProduct = await prisma.product.findFirst({
                where: {
                    id: { not: id },
                    name: {
                        equals: normalizedName,
                        mode: "insensitive",
                    },
                },
                select: { id: true },
            });

            if (duplicateProduct) {
                throw new ApiError(409, "Product with this name already exists");
            }
        }

        if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        if (restockLevel !== undefined) {
            if (typeof restockLevel !== "number" || restockLevel < 0) {
                throw new ApiError(400, "Restock level must be a non-negative number");
            }
        }

        const data = await prisma.product.update({
            where: { id },
            data: {
                ...(normalizedName !== undefined && { name: normalizedName }),
                ...(description !== undefined && { description: description || null }),
                ...(category !== undefined && { category }),
                ...(restockLevel !== undefined && { restockLevel }),
                ...(costPrice !== undefined && { costPrice }),
            },
        });

        return res.status(200).json(new ApiResponse(200, "Product updated successfully", data));
    } catch (err) {
        next(err);
    }
};

export const removeProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) throw new ApiError(404, "Product not found");

        const [hasPurchaseItems, hasSaleItems, hasBOMs, hasBOMItems, hasProductions, hasInventoryTransactions, hasInventory] = await Promise.all([
            prisma.purchaseItem.findFirst({ where: { productId: id }, select: { id: true } }),
            prisma.saleItem.findFirst({ where: { productId: id }, select: { id: true } }),
            prisma.bOM.findFirst({ where: { productId: id }, select: { id: true } }),
            prisma.bOMItem.findFirst({ where: { rawMaterialId: id }, select: { id: true } }),
            prisma.production.findFirst({ where: { productId: id }, select: { id: true } }),
            prisma.inventoryTransaction.findFirst({ where: { productId: id }, select: { id: true } }),
            prisma.inventory.findUnique({ where: { productId: id }, select: { id: true } }),
        ]);

        if (hasPurchaseItems || hasSaleItems || hasBOMs || hasBOMItems || hasProductions || hasInventoryTransactions || hasInventory) {
            throw new ApiError(409, "Cannot delete product with existing dependent records");
        }

        await prisma.product.delete({ where: { id } });

        return res.status(200).json(new ApiResponse(200, "Product deleted successfully"));
    } catch (err) {
        next(err);
    }
};
