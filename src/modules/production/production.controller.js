import { ApiResponse, ApiError } from "../../utils/response.js";
import {
	recordProduction as recordProductionService,
	getProductionHistory as getProductionHistoryService,
	getProductionById as getProductionByIdService,
} from "./production.service.js";

export const recordProduction = async (req, res, next) => {
	try {
		const { productId, quantity, productionDate } = req.body;

		if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
			throw new ApiError(400, "productId is required and must be a positive integer");
		}

		if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
			throw new ApiError(400, "quantity must be a positive integer");
		}

		let parsedDate = new Date();
		if (productionDate !== undefined) {
			parsedDate = new Date(productionDate);
			if (Number.isNaN(parsedDate.getTime())) {
				throw new ApiError(400, "productionDate must be a valid date");
			}
		}

		const data = await recordProductionService({
			productId: Number(productId),
			quantity: Number(quantity),
			productionDate: parsedDate,
		});

		return res.status(201).json(new ApiResponse(201, "Production recorded successfully", data));
	} catch (err) {
		next(err);
	}
};

export const getAllProduction = async (req, res, next) => {
	try {
		const {
			page,
			limit,
			search,
			startDate,
			endDate,
			minQty,
			maxQty,
			sortBy = "productionDate",
			sortOrder = "desc",
		} = req.query;

		const pageNum = Math.max(1, Number.parseInt(page, 10) || 1);
		const limitNum = Math.max(1, Number.parseInt(limit, 10) || 10);
		const skip = (pageNum - 1) * limitNum;

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

		let parsedMinQty;
		if (minQty !== undefined) {
			parsedMinQty = Number(minQty);
			if (!Number.isInteger(parsedMinQty) || parsedMinQty < 0) {
				throw new ApiError(400, "minQty must be a non-negative integer");
			}
		}

		let parsedMaxQty;
		if (maxQty !== undefined) {
			parsedMaxQty = Number(maxQty);
			if (!Number.isInteger(parsedMaxQty) || parsedMaxQty < 0) {
				throw new ApiError(400, "maxQty must be a non-negative integer");
			}
		}

		if (
			parsedMinQty !== undefined &&
			parsedMaxQty !== undefined &&
			parsedMinQty > parsedMaxQty
		) {
			throw new ApiError(400, "minQty must be less than or equal to maxQty");
		}

		const validSortFields = ["productionDate", "quantity", "createdAt", "productName"];
		if (!validSortFields.includes(sortBy)) {
			throw new ApiError(400, `sortBy must be one of: ${validSortFields.join(", ")}`);
		}

		const normalizedSortOrder = String(sortOrder).toLowerCase();
		if (!["asc", "desc"].includes(normalizedSortOrder)) {
			throw new ApiError(400, "sortOrder must be 'asc' or 'desc'");
		}

		const { data, total } = await getProductionHistoryService({
			skip,
			take: limitNum,
			search: typeof search === "string" ? search.trim() : undefined,
			startDate: parsedStartDate,
			endDate: parsedEndDate,
			minQty: parsedMinQty,
			maxQty: parsedMaxQty,
			sortBy,
			sortOrder: normalizedSortOrder,
		});

		return res.status(200).json(
			new ApiResponse(200, "Production history retrieved successfully", {
				productions: data,
				meta: { total, page: pageNum, limit: limitNum },
			})
		);
	} catch (err) {
		next(err);
	}
};

export const getProduction = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);

		if (Number.isNaN(id)) {
			throw new ApiError(400, "Invalid production ID");
		}

		const data = await getProductionByIdService(id);

		if (!data) {
			throw new ApiError(404, "Production record not found");
		}

		return res.status(200).json(new ApiResponse(200, "Production record retrieved successfully", data));
	} catch (err) {
		next(err);
	}
};
