import { Router } from "express";
import { authorizePermission } from "../../middleware/role.middleware.js";
import {
	createOrReplaceBOM,
	getBOMByFinishedProduct,
} from "./bom.controller.js";
import {
	recordProduction,
	getAllProduction,
	getProduction,
} from "./production.controller.js";

const router = Router();

// POST /api/production/upsert-bom                  - create or replace BOM for a finished product
// GET  /api/production/get-bom/:productId          - get BOM for a finished product
// POST /api/production/record-production           - consume raw materials and add finished goods
// GET  /api/production/get-productions             - list production history (paginated)
// GET  /api/production/get-production/:id          - get a single production record

router.post(
	"/upsert-bom",
	authorizePermission("production:create"),
	createOrReplaceBOM
);

router.get(
	"/get-bom/:productId",
	authorizePermission("production:read"),
	getBOMByFinishedProduct
);

router.post(
	"/record-production",
	authorizePermission("production:create"),
	recordProduction
);

router.get(
	"/get-productions",
	authorizePermission("production:read"),
	getAllProduction
);

router.get(
	"/get-production/:id",
	authorizePermission("production:read"),
	getProduction
);

export default router;
