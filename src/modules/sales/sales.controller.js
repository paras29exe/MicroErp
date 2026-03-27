import { ApiResponse, ApiError } from "../../utils/response.js";
import {
    createSale as createSaleService,
    getSales as getSalesService,
    getSaleById as getSaleByIdService,
    removeSale as removeSaleService,
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
            const { productId, quantity, unitSellingPrice, sellingPrice, unitCost, costPrice } = item;

            if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
                throw new ApiError(400, `items[${index}].productId must be a positive integer`);
            }

            if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
                throw new ApiError(400, `items[${index}].quantity must be a positive integer`);
            }

            const resolvedUnitSellingPrice = unitSellingPrice ?? sellingPrice;

            if (
                resolvedUnitSellingPrice === undefined ||
                resolvedUnitSellingPrice === null ||
                isNaN(Number(resolvedUnitSellingPrice)) ||
                Number(resolvedUnitSellingPrice) < 0
            ) {
                throw new ApiError(400, `items[${index}].unitSellingPrice must be a non-negative number`);
            }

            if (unitCost !== undefined || costPrice !== undefined) {
                throw new ApiError(400, `items[${index}].unitCost should not be provided`);
            }

            return {
                productId: Number(productId),
                quantity: Number(quantity),
                unitSellingPrice: Number(resolvedUnitSellingPrice),
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
        const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const {
            productId,
            productName,
            startDate,
            endDate,
            minAmount,
            maxAmount,
            profit,
            search,
            customerName,
            customerPhone,
            sortBy = "saleDate",
            sortOrder = "desc",
        } = req.query;

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

        let parsedMinAmount;
        if (minAmount !== undefined) {
            parsedMinAmount = Number(minAmount);
            if (Number.isNaN(parsedMinAmount) || parsedMinAmount < 0) {
                throw new ApiError(400, "minAmount must be a non-negative number");
            }
        }

        let parsedMaxAmount;
        if (maxAmount !== undefined) {
            parsedMaxAmount = Number(maxAmount);
            if (Number.isNaN(parsedMaxAmount) || parsedMaxAmount < 0) {
                throw new ApiError(400, "maxAmount must be a non-negative number");
            }
        }

        if (
            parsedMinAmount !== undefined &&
            parsedMaxAmount !== undefined &&
            parsedMinAmount > parsedMaxAmount
        ) {
            throw new ApiError(400, "minAmount must be less than or equal to maxAmount");
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

        const normalizedSearch = typeof search === "string" ? search.trim() : undefined;
        const normalizedCustomerName =
            typeof customerName === "string" ? customerName.trim() : undefined;
        const normalizedCustomerPhone =
            typeof customerPhone === "string" ? customerPhone.trim() : undefined;
        const normalizedProductName =
            typeof productName === "string" ? productName.trim() : undefined;

        if (normalizedCustomerPhone && !/^[0-9()+\s-]+$/.test(normalizedCustomerPhone)) {
            throw new ApiError(400, "customerPhone has invalid format");
        }

        const validSortFields = ["saleDate", "grossSales", "grossProfit", "totalAmount", "totalCogs", "createdAt", "customerName"];
        if (!validSortFields.includes(sortBy)) {
            throw new ApiError(400, `sortBy must be one of: ${validSortFields.join(", ")}`);
        }

        const normalizedSortOrder = String(sortOrder).toLowerCase();
        if (!['asc', 'desc'].includes(normalizedSortOrder)) {
            throw new ApiError(400, "sortOrder must be 'asc' or 'desc'");
        }

        const { data, total } = await getSalesService({
            skip,
            take: limit,
            productId: parsedProductId,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            minAmount: parsedMinAmount,
            maxAmount: parsedMaxAmount,
            profitFilter,
            search: normalizedSearch,
            customerName: normalizedCustomerName,
            customerPhone: normalizedCustomerPhone,
            productName: normalizedProductName,
            sortBy,
            sortOrder: normalizedSortOrder,
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
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "Invalid sale ID");

        const data = await getSaleByIdService(id);

        if (!data) throw new ApiError(404, "Sale not found");

        return res.status(200).json(new ApiResponse(200, "Sale retrieved successfully", data));
    } catch (err) {
        next(err);
    }
};

export const removeSale = async (req, res, next) => {
    try {
        const id = Number.parseInt(req.params.id, 10);
        if (!Number.isInteger(id) || id <= 0) {
            throw new ApiError(400, "Invalid sale ID");
        }

        const deleted = await removeSaleService(id);
        return res.status(200).json(new ApiResponse(200, "Sale deleted successfully", deleted));
    } catch (err) {
        next(err);
    }
};