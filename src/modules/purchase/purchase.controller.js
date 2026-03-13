import { ApiResponse, ApiError } from "../../utils/response.js";
import {
    createPurchase as createPurchaseService,
    getPurchases as getPurchasesService,
    getPurchaseById as getPurchaseByIdService,
    updatePaymentStatus as updatePaymentStatusService,
    deletePurchase as deletePurchaseService,
} from "./purchase.service.js";

const VALID_PAYMENT_STATUSES = ["pending", "paid"];

export const createPurchase = async (req, res, next) => {
    try {
        const { vendorId, purchaseDate, paymentStatus, items } = req.body;

        if (!vendorId || !Number.isInteger(Number(vendorId)) || Number(vendorId) <= 0) {
            throw new ApiError(400, "vendorId is required and must be a positive integer");
        }

        if (!purchaseDate || Number.isNaN(new Date(purchaseDate).getTime())) {
            throw new ApiError(400, "purchaseDate is required and must be a valid date");
        }

        if (!paymentStatus || !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
            throw new ApiError(400, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`);
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new ApiError(400, "items must be a non-empty array");
        }

        const normalizedItems = items.map((item, index) => {
            const { productId, quantity, price } = item;

            if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
                throw new ApiError(400, `items[${index}].productId must be a positive integer`);
            }

            if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
                throw new ApiError(400, `items[${index}].quantity must be a positive integer`);
            }

            if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
                throw new ApiError(400, `items[${index}].price must be a non-negative number`);
            }

            return {
                productId: Number(productId),
                quantity: Number(quantity),
                price: Number(price),
            };
        });

        const created = await createPurchaseService({
            vendorId: Number(vendorId),
            purchaseDate: new Date(purchaseDate),
            paymentStatus,
            items: normalizedItems,
        });

        return res.status(201).json(new ApiResponse(201, "Purchase created successfully", created));
    } catch (err) {
        next(err);
    }
};

export const getAllPurchases = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const { data, total } = await getPurchasesService({ skip, take: limit });

        return res.status(200).json(
            new ApiResponse(200, "Purchases retrieved successfully", {
                purchases: data,
                meta: { total, page, limit },
            })
        );
    } catch (err) {
        next(err);
    }
};

export const getPurchaseById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) throw new ApiError(400, "Invalid purchase ID");

        const data = await getPurchaseByIdService(id);

        if (!data) throw new ApiError(404, "Purchase not found");

        return res.status(200).json(new ApiResponse(200, "Purchase retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const updatePaymentStatus = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        const { paymentStatus } = req.body;

        if (Number.isNaN(id)) throw new ApiError(400, "Invalid purchase ID");
        if (!paymentStatus || !VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
            throw new ApiError(400, `paymentStatus must be one of: ${VALID_PAYMENT_STATUSES.join(", ")}`);
        }

        const existing = await getPurchaseByIdService(id);
        if (!existing) throw new ApiError(404, "Purchase not found");

        const updated = await updatePaymentStatusService(id, paymentStatus);

        return res.status(200).json(new ApiResponse(200, "Payment status updated successfully", updated));
    } catch (err) {
        next(err);
    }
};

export const deletePurchase = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) throw new ApiError(400, "Invalid purchase ID");

        const deleted = await deletePurchaseService(id);
        if (!deleted) throw new ApiError(404, "Purchase not found");

        return res.status(200).json(new ApiResponse(200, "Purchase deleted successfully"));
    } catch (err) {
        next(err);
    }
};
