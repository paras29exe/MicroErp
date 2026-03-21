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
		const page = Math.max(1, parseInt(req.query.page) || 1);
		const limit = Math.max(1, parseInt(req.query.limit) || 10);
		const skip = (page - 1) * limit;

		const { data, total } = await getProductionHistoryService({ skip, take: limit });

		return res.status(200).json(
			new ApiResponse(200, "Production history retrieved successfully", {
				productions: data,
				meta: { total, page, limit },
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
