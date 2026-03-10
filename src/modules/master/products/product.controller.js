import prisma from "../../../config/db.js";
import { ApiResponse, ApiError } from "../../../utils/response.js";

const VALID_CATEGORIES = ["raw", "wip", "finished"];

export const addProduct = async (req, res, next) => {
    try {
        const { name, price, description, category } = req.body;

        if (!name || typeof name !== "string" || name.trim() === "") {
            throw new ApiError(400, "Product name is required");
        }

        if (!category) throw new ApiError(400, "Category is required");
        if (!VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        if (price == null) throw new ApiError(400, "Price is required");
        if (typeof price !== "number" || price <= 0) {
            throw new ApiError(400, "Price must be a positive number");
        }

        const data = await prisma.product.create({
            data: { name: name.trim(), description: description || null, category, price },
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

        const { name, description, category, price } = req.body;

        if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
            throw new ApiError(400, "Product name cannot be empty");
        }

        if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
            throw new ApiError(400, `Category must be one of: ${VALID_CATEGORIES.join(", ")}`);
        }

        if (price !== undefined && (typeof price !== "number" || price <= 0)) {
            throw new ApiError(400, "Price must be a positive number");
        }

        const data = await prisma.product.update({
            where: { id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description || null }),
                ...(category !== undefined && { category }),
                ...(price !== undefined && { price }),
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

        await prisma.product.delete({ where: { id } });

        return res.status(200).json(new ApiResponse(200, "Product deleted successfully"));
    } catch (err) {
        next(err);
    }
};
