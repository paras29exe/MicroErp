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
        const { search, lowStock, page = 1, limit = 10 } = req.query;
        const pageNum = Math.max(1, parseInt(page));
        const limitNum = Math.max(1, parseInt(limit));

        const { data, total } = await getInventory({
            search,
            lowStock: lowStock === "true",
            page: pageNum,
            limit: limitNum,
        });

        return res.status(200).json(
            new ApiResponse(200, "Inventory retrieved successfully", {
                inventory: data.map((p) => ({
                    productId: p.id,
                    productName: p.name,
                    stockQuantity: p.inventory.stockQuantity,
                    reorderLevel: p.inventory.reorderLevel,
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
