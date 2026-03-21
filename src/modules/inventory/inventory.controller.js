import { ApiResponse, ApiError } from "../../utils/response.js";
import {
    getInventory,
    getProductInventory as getProductInventoryService,
    getLowStockProducts,
    adjustStock as adjustStockService,
    getInventorySummary,
    updateReorderLevel as updateReorderLevelService,
} from "./inventory.service.js";

export const getAllInventory = async (req, res, next) => {
    try {
        const {
            search,
            lowStock,
            category,
            stockStatus,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            sortBy = "updatedAt",
            sortOrder = "desc",
        } = req.query;

        const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
        const limitNum = Math.max(1, Number.parseInt(limit, 10) || 10);

        const validCategories = ["raw", "wip", "finished"];
        if (category && !validCategories.includes(category)) {
            throw new ApiError(400, `category must be one of: ${validCategories.join(", ")}`);
        }

        const validStockStatuses = ["in", "out", "low"];
        if (stockStatus && !validStockStatuses.includes(stockStatus)) {
            throw new ApiError(400, `stockStatus must be one of: ${validStockStatuses.join(", ")}`);
        }

        let parsedStartDate;
        if (startDate !== undefined) {
            parsedStartDate = new Date(startDate);
            if (Number.isNaN(parsedStartDate.getTime())) {
                throw new ApiError(400, "startDate must be a valid date");
            }
        }

        let parsedEndDate;
        if (endDate !== undefined) {
            parsedEndDate = new Date(endDate);
            if (Number.isNaN(parsedEndDate.getTime())) {
                throw new ApiError(400, "endDate must be a valid date");
            }
            parsedEndDate.setHours(23, 59, 59, 999);
        }

        if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
            throw new ApiError(400, "startDate must be before or equal to endDate");
        }

        const validSortFields = ["updatedAt", "stockQuantity", "reorderLevel", "productName"];
        if (!validSortFields.includes(sortBy)) {
            throw new ApiError(400, `sortBy must be one of: ${validSortFields.join(", ")}`);
        }

        const normalizedSortOrder = String(sortOrder).toLowerCase();
        if (!["asc", "desc"].includes(normalizedSortOrder)) {
            throw new ApiError(400, "sortOrder must be 'asc' or 'desc'");
        }

        const { data, total } = await getInventory({
            search,
            lowStock: lowStock === "true",
            category,
            stockStatus,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            page: pageNum,
            limit: limitNum,
            sortBy,
            sortOrder: normalizedSortOrder,
        });

        return res.status(200).json(
            new ApiResponse(200, "Inventory retrieved successfully", {
                inventory: data.map((row) => ({
                    productId: row.product.id,
                    productName: row.product.name,
                    category: row.product.category,
                    stockQuantity: row.stockQuantity,
                    reorderLevel: row.reorderLevel,
                    updatedAt: row.updatedAt,
                })),
                meta: { total, page: pageNum, limit: limitNum },
            })
        );
    } catch (err) {
        next(err);
    }
};

export const getProductInventory = async (req, res, next) => {
    try {
        const id = parseInt(req.params.productId);
        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        const data = await getProductInventoryService(id);

        return res.status(200).json(new ApiResponse(200, "Product inventory retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const getLowStock = async (req, res, next) => {
    try {
        const data = await getLowStockProducts();

        return res.status(200).json(new ApiResponse(200, "Low stock products retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const adjustStock = async (req, res, next) => {
    try {
        const { productId, adjustmentType, quantity, reason } = req.body;

        if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
            throw new ApiError(400, "productId is required and must be a positive integer");
        }

        if (!adjustmentType || !["increase", "decrease"].includes(adjustmentType)) {
            throw new ApiError(400, "adjustmentType must be 'increase' or 'decrease'");
        }

        if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
            throw new ApiError(400, "quantity must be a positive integer");
        }

        if (!reason || typeof reason !== "string" || reason.trim() === "") {
            throw new ApiError(400, "reason is required");
        }

        const result = await adjustStockService({
            productId: Number(productId),
            adjustmentType,
            quantity: Number(quantity),
            reason: reason.trim(),
        });

        return res.status(200).json(new ApiResponse(200, result.message));
    } catch (err) {
        next(err);
    }
};

export const getSummary = async (req, res, next) => {
    try {
        const data = await getInventorySummary();

        return res.status(200).json(new ApiResponse(200, "Inventory summary retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const updateReorderLevel = async (req, res, next) => {
    try {
        const id = parseInt(req.params.productId);
        const { reorderLevel } = req.body;

        if (isNaN(id)) throw new ApiError(400, "Invalid product ID");

        if (reorderLevel === undefined || !Number.isInteger(Number(reorderLevel)) || Number(reorderLevel) < 0) {
            throw new ApiError(400, "reorderLevel must be a non-negative integer");
        }

        const result = await updateReorderLevelService(id, Number(reorderLevel));

        return res.status(200).json(new ApiResponse(200, result.message));
    } catch (err) {
        next(err);
    }
};
