import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const VALID_CATEGORIES = ["raw", "wip", "finished"];
const VALID_STATUS = ["active", "archived", "all"];

export const addProduct = async (req, res, next) => {
    try {
        const { name, description, category, restockLevel } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            throw new ApiError(400, "Product name is required");
        }

        const normalizedName = name.trim();

        const duplicateProduct = await prisma.product.findFirst({
            where: {
                isDeleted: false,
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

        const data = await prisma.product.create({
            data: {
                name: normalizedName,
                description: description || null,
                category,
                restockLevel: restockLevel,
            },
        });

        return res.status(201).json(new ApiResponse(201, "Product added successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getProducts = async (req, res, next) => {
    try {
        const { category, search, name, status = "active", page: pageQuery, pageSize: pageSizeQuery } = req.query;

        if (category && !VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        if (!VALID_STATUS.includes(status)) {
            throw new ApiError(400, `Status must be one of: ${VALID_STATUS.join(", ")}`);
        }

        const page = pageQuery === undefined ? 1 : Number(pageQuery);
        const pageSize = pageSizeQuery === undefined ? 20 : Number(pageSizeQuery);

        if (!Number.isInteger(page) || page < 1) {
            throw new ApiError(400, "Page must be a positive integer");
        }

        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            throw new ApiError(400, "Page size must be an integer between 1 and 100");
        }

        const rawNameQuery = typeof search === "string" && search.trim() !== ""
            ? search
            : typeof name === "string"
                ? name
                : "";
        const nameQuery = rawNameQuery.trim();

        const where = {
            ...(category ? { category } : {}),
            ...(nameQuery
                ? {
                      name: {
                          contains: nameQuery,
                          mode: "insensitive",
                      },
                  }
                : {}),
            ...(status === "active" ? { isDeleted: false } : {}),
            ...(status === "archived" ? { isDeleted: true } : {}),
        };

        const finalWhere = Object.keys(where).length ? where : undefined;
        const skip = (page - 1) * pageSize;

        const [items, total] = await Promise.all([
            prisma.product.findMany({
                where: finalWhere,
                orderBy: [{ name: "asc" }, { id: "desc" }],
                skip,
                take: pageSize,
            }),
            prisma.product.count({ where: finalWhere }),
        ]);

        const data = {
            items,
            meta: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };

        return res.status(200).json(new ApiResponse(200, "Products retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const data = await prisma.product.findFirst({ where: { id, isDeleted: false } });
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

        const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
        if (!existing) throw new ApiError(404, "Product not found");

        const { name, description, category, restockLevel } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            throw new ApiError(400, "Product name cannot be empty");
        }

        const normalizedName = name !== undefined ? name.trim() : undefined;

        if (normalizedName !== undefined) {
            const duplicateProduct = await prisma.product.findFirst({
                where: {
                    id: { not: id },
                    isDeleted: false,
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

        const existing = await prisma.product.findFirst({ where: { id, isDeleted: false } });
        if (!existing) throw new ApiError(404, "Product not found");

        await prisma.product.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
            },
        });

        return res.status(200).json(new ApiResponse(200, "Product archived successfully"));
    } catch (err) {
        next(err);
    }
};

export const restoreProduct = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const archivedProduct = await prisma.product.findFirst({ where: { id, isDeleted: true } });
        if (!archivedProduct) throw new ApiError(404, "Archived product not found");

        const duplicateActive = await prisma.product.findFirst({
            where: {
                id: { not: id },
                isDeleted: false,
                name: {
                    equals: archivedProduct.name,
                    mode: "insensitive",
                },
            },
            select: { id: true },
        });

        if (duplicateActive) {
            throw new ApiError(409, "Cannot restore product because an active product with the same name already exists");
        }

        await prisma.product.update({
            where: { id },
            data: {
                isDeleted: false,
                deletedAt: null,
            },
        });

        return res.status(200).json(new ApiResponse(200, "Product restored successfully"));
    } catch (err) {
        next(err);
    }
};

export const getFinishedProductsWithStock = async (req, res, next) => {
    try {
        const rawSearch = typeof req.query.search === "string" ? req.query.search : "";
        const search = rawSearch.trim();

        const products = await prisma.product.findMany({
            where: {
                category: "finished",
                isDeleted: false,
                ...(search
                    ? {
                          name: {
                              contains: search,
                              mode: "insensitive",
                          },
                      }
                    : {}),
            },
            orderBy: { name: "asc" },
            include: {
                inventory: {
                    select: {
                        stockQuantity: true,
                        reorderLevel: true,
                        avgCost: true,
                    },
                },
            },
        });

        const items = products.map((product) => {
            const stockQuantity = product.inventory?.stockQuantity || 0;
            const reorderLevel = product.inventory?.reorderLevel ?? product.restockLevel;
            const stockStatus = stockQuantity <= 0
                ? "out_of_stock"
                : stockQuantity <= reorderLevel
                    ? "low_stock"
                    : "in_stock";

            return {
                id: product.id,
                name: product.name,
                category: product.category,
                restockLevel: product.restockLevel,
                stockQuantity,
                reorderLevel,
                stockStatus,
                unitPrice: product.inventory?.avgCost ?? null,
            };
        });

        return res
            .status(200)
            .json(new ApiResponse(200, "Finished products with stock retrieved successfully", { items }));
    } catch (err) {
        next(err);
    }
};
