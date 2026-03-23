import { Router } from "express";
import {
    createSale,
    getAllSales,
    getSaleById,
} from "./sales.controller.js";
import { authorizePermission } from "../../middleware/role.middleware.js";

const router = Router();

// POST   /api/sales/add-sale          - create a new sale
// GET    /api/sales/get-sales         - list sales (paginated)
// GET    /api/sales/get-sale/:id      - get a single sale

router.post(
    "/add-sale",
    authorizePermission("sales:create"),
    createSale
);
router.get(
    "/get-sales",
    authorizePermission("sales:read"),
    getAllSales
);
router.get(
    "/get-sale/:id",
    authorizePermission("sales:read"),
    getSaleById
);

export default router;