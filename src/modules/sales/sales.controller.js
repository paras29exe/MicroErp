import { ApiResponse, ApiError } from "../../utils/response.js";
import {
    createSale as createSaleService,
    getSales as getSalesService,
    getSaleById as getSaleByIdService,
} from "./sales.service.js";

export const createSale = async (req, res, next) => {
    try {
        const { customerId, saleDate, items } = req.body;

        if (!customerId || !Number.isInteger(Number(customerId)) || Number(customerId) <= 0) {
            throw new ApiError(400, "customerId is required and must be a positive integer");
        }

        const normalizedSaleDate = saleDate ? new Date(saleDate) : new Date();
        if (saleDate && Number.isNaN(normalizedSaleDate.getTime())) {
            throw new ApiError(400, "saleDate must be a valid date");
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new ApiError(400, "items must be a non-empty array");
        }

        const normalizedItems = items.map((item, index) => {
            const { productId, quantity, sellingPrice, costPrice } = item;

            if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
                throw new ApiError(400, `items[${index}].productId must be a positive integer`);
            }

            if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
                throw new ApiError(400, `items[${index}].quantity must be a positive integer`);
            }

            if (sellingPrice === undefined || sellingPrice === null || isNaN(Number(sellingPrice)) || Number(sellingPrice) < 0) {
                throw new ApiError(400, `items[${index}].sellingPrice must be a non-negative number`);
            }

            if (costPrice !== undefined) {
                throw new ApiError(400, `items[${index}].costPrice should not be provided`);
            }

            return {
                productId: Number(productId),
                quantity: Number(quantity),
                sellingPrice: Number(sellingPrice),
            };
        });

        const created = await createSaleService({
            customerId: Number(customerId),
            saleDate: normalizedSaleDate,
            items: normalizedItems,
        });

        return res.status(201).json(new ApiResponse(201, "Sale created successfully", created));
    } catch (err) {
        next(err);
    }
};

export const getAllSales = async (req, res, next) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.max(1, parseInt(req.query.limit) || 10);
        const skip = (page - 1) * limit;

        const { productId, startDate, endDate, profit } = req.query;

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

        let profitFilter;
        if (profit !== undefined) {
            if (profit === "positive") {
                profitFilter = "positive";
            } else if (profit === "negative") {
                profitFilter = "negative";
            } else {
                throw new ApiError(400, "profit filter must be 'positive' or 'negative'");
            }
        }

        const parsedProductId = productId !== undefined ? Number(productId) : undefined;
        if (productId !== undefined && (!Number.isInteger(parsedProductId) || parsedProductId <= 0)) {
            throw new ApiError(400, "productId must be a positive integer");
        }

        const { data, total } = await getSalesService({
            skip,
            take: limit,
            productId: parsedProductId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            profitFilter,
        });

        return res.status(200).json(
            new ApiResponse(200, "Sales retrieved successfully", {
                sales: data,
                meta: { total, page, limit },
            })
        );
    } catch (err) {
        next(err);
    }
};

export const getSaleById = async (req, res, next) => {
    try {
        const id = parseInt(req.params.id);
        if (Number.isNaN(id)) throw new ApiError(400, "Invalid sale ID");

        const data = await getSaleByIdService(id);

        if (!data) throw new ApiError(404, "Sale not found");

        return res.status(200).json(new ApiResponse(200, "Sale retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};