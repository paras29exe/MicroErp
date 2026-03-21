import prisma from "../../config/db.js";
import { ApiError } from "../../utils/response.js";
import { increaseStock, decreaseStock } from "../inventory/inventory.service.js";

const getFinishedProductOrThrow = async (productId, tx = prisma) => {
	const product = await tx.product.findUnique({
		where: { id: productId },
		select: { id: true, name: true, category: true },
	});

	if (!product) {
		throw new ApiError(404, `Finished product with ID ${productId} not found`);
	}

	if (product.category !== "finished") {
		throw new ApiError(400, "BOM/production is only allowed for finished products");
	}

	return product;
};

const normalizeBomItems = (items) => {
	const quantityByRawMaterialId = new Map();

	for (const item of items) {
		const previous = quantityByRawMaterialId.get(item.rawMaterialId) || 0;
		quantityByRawMaterialId.set(item.rawMaterialId, previous + item.quantity);
	}

	return [...quantityByRawMaterialId.entries()].map(([rawMaterialId, quantity]) => ({
		rawMaterialId,
		quantity,
	}));
};

export const createOrReplaceBOM = async ({ productId, items }) => {
	const normalizedItems = normalizeBomItems(items);

	return prisma.$transaction(async (tx) => {
		await getFinishedProductOrThrow(productId, tx);

		const rawMaterialIds = normalizedItems.map((item) => item.rawMaterialId);
		const rawMaterials = await tx.product.findMany({
			where: { id: { in: rawMaterialIds } },
			select: { id: true, category: true },
		});

		if (rawMaterials.length !== rawMaterialIds.length) {
			const existingIds = new Set(rawMaterials.map((product) => product.id));
			const missingIds = rawMaterialIds.filter((id) => !existingIds.has(id));
			throw new ApiError(400, `Invalid rawMaterialId(s): ${missingIds.join(", ")}`);
		}

		const nonRawIds = rawMaterials
			.filter((material) => material.category !== "raw")
			.map((material) => material.id);

		if (nonRawIds.length > 0) {
			throw new ApiError(400, `Only raw products are allowed in BOM. Invalid ID(s): ${nonRawIds.join(", ")}`);
		}

		const existingBoms = await tx.bOM.findMany({
			where: { productId },
			select: { id: true },
		});

		if (existingBoms.length > 0) {
			const existingBomIds = existingBoms.map((bom) => bom.id);
			await tx.bOMItem.deleteMany({ where: { bomId: { in: existingBomIds } } });
			await tx.bOM.deleteMany({ where: { id: { in: existingBomIds } } });
		}

		const bom = await tx.bOM.create({
			data: {
				productId,
				items: {
					createMany: {
						data: normalizedItems,
					},
				},
			},
			include: {
				product: true,
				items: {
					include: {
						rawMaterial: true,
					},
				},
			},
		});

		return bom;
	}, { maxWait: 10000, timeout: 20000 });
};

export const getBOMByFinishedProduct = async (productId) => {
	await getFinishedProductOrThrow(productId);

	const bom = await prisma.bOM.findFirst({
		where: { productId },
		orderBy: { updatedAt: "desc" },
		include: {
			product: true,
			items: {
				include: {
					rawMaterial: true,
				},
			},
		},
	});

	if (!bom) {
		throw new ApiError(404, "BOM not found for this finished product");
	}

	return bom;
};

export const recordProduction = async ({ productId, quantity, productionDate }) => {
	return prisma.$transaction(async (tx) => {
		await getFinishedProductOrThrow(productId, tx);

		const bom = await tx.bOM.findFirst({
			where: { productId },
			orderBy: { updatedAt: "desc" },
			include: {
				items: true,
			},
		});

		if (!bom || bom.items.length === 0) {
			throw new ApiError(400, "BOM is required before recording production");
		}

		const requiredRawItems = bom.items.map((item) => ({
			rawMaterialId: item.rawMaterialId,
			requiredQuantity: item.quantity * quantity,
		}));

		const rawMaterialIds = requiredRawItems.map((item) => item.rawMaterialId);
		const inventories = await tx.inventory.findMany({
			where: { productId: { in: rawMaterialIds } },
			select: { productId: true, stockQuantity: true },
		});

		const stockByProductId = new Map(inventories.map((inv) => [inv.productId, inv.stockQuantity]));

		const insufficients = requiredRawItems
			.filter((item) => (stockByProductId.get(item.rawMaterialId) || 0) < item.requiredQuantity)
			.map((item) => ({
				rawMaterialId: item.rawMaterialId,
				required: item.requiredQuantity,
				available: stockByProductId.get(item.rawMaterialId) || 0,
			}));

		if (insufficients.length > 0) {
			const details = insufficients
				.map((item) => `rawMaterialId ${item.rawMaterialId}: required ${item.required}, available ${item.available}`)
				.join("; ");
			throw new ApiError(400, `Insufficient raw material stock. ${details}`);
		}

		const production = await tx.production.create({
			data: {
				productId,
				quantity,
				productionDate,
			},
		});

		for (const item of requiredRawItems) {
			await decreaseStock(
				item.rawMaterialId,
				item.requiredQuantity,
				"PROD_CONSUME_RAW",
				`PROD-${production.id}`,
				tx
			);
		}

		await increaseStock(
			productId,
			quantity,
			"PROD_OUTPUT_FINISHED",
			`PROD-${production.id}`,
			tx
		);

		return tx.production.findUnique({
			where: { id: production.id },
			include: {
				product: true,
			},
		});
	}, { maxWait: 10000, timeout: 20000 });
};

export const getProductionHistory = async ({
	skip,
	take,
	search,
	startDate,
	endDate,
	minQty,
	maxQty,
	sortBy = "productionDate",
	sortOrder = "desc",
}) => {
	const andFilters = [];

	if (startDate || endDate) {
		andFilters.push({
			productionDate: {
				...(startDate && { gte: startDate }),
				...(endDate && { lte: endDate }),
			},
		});
	}

	if (minQty !== undefined || maxQty !== undefined) {
		andFilters.push({
			quantity: {
				...(minQty !== undefined && { gte: minQty }),
				...(maxQty !== undefined && { lte: maxQty }),
			},
		});
	}

	if (search) {
		const numericSearch = Number.parseInt(search, 10);
		const orFilters = [
			{
				product: {
					name: { contains: search, mode: "insensitive" },
				},
			},
		];

		if (!Number.isNaN(numericSearch) && String(numericSearch) === search.trim()) {
			orFilters.push({ id: numericSearch });
		}

		andFilters.push({ OR: orFilters });
	}

	const where = andFilters.length > 0 ? { AND: andFilters } : undefined;
	const orderBy = sortBy === "productName" ? { product: { name: sortOrder } } : { [sortBy]: sortOrder };

	const [data, total] = await Promise.all([
		prisma.production.findMany({
			where,
			skip,
			take,
			orderBy,
			include: {
				product: true,
			},
		}),
		prisma.production.count({ where }),
	]);

	return { data, total };
};

export const getProductionById = async (id) => {
	return prisma.production.findUnique({
		where: { id },
		include: {
			product: true,
		},
	});
};
