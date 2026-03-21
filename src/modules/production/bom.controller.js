import { ApiResponse, ApiError } from "../../utils/response.js";
import {
	createOrReplaceBOM as createOrReplaceBOMService,
	getBOMByFinishedProduct as getBOMByFinishedProductService,
} from "./production.service.js";

export const createOrReplaceBOM = async (req, res, next) => {
	try {
		const { productId, items } = req.body;

		if (!productId || !Number.isInteger(Number(productId)) || Number(productId) <= 0) {
			throw new ApiError(400, "productId is required and must be a positive integer");
		}

		if (!Array.isArray(items) || items.length === 0) {
			throw new ApiError(400, "items must be a non-empty array");
		}

		const normalizedItems = items.map((item, index) => {
			const { rawMaterialId, quantity } = item;

			if (!rawMaterialId || !Number.isInteger(Number(rawMaterialId)) || Number(rawMaterialId) <= 0) {
				throw new ApiError(400, `items[${index}].rawMaterialId must be a positive integer`);
			}

			if (!quantity || !Number.isInteger(Number(quantity)) || Number(quantity) <= 0) {
				throw new ApiError(400, `items[${index}].quantity must be a positive integer`);
			}

			return {
				rawMaterialId: Number(rawMaterialId),
				quantity: Number(quantity),
			};
		});

		const bom = await createOrReplaceBOMService({
			productId: Number(productId),
			items: normalizedItems,
		});

		return res.status(201).json(new ApiResponse(201, "BOM saved successfully", bom));
	} catch (err) {
		next(err);
	}
};

export const getBOMByFinishedProduct = async (req, res, next) => {
	try {
		const productId = parseInt(req.params.productId);

		if (Number.isNaN(productId)) {
			throw new ApiError(400, "Invalid finished product ID");
		}

		const bom = await getBOMByFinishedProductService(productId);

		return res.status(200).json(new ApiResponse(200, "BOM retrieved successfully", bom));
	} catch (err) {
		next(err);
	}
};
