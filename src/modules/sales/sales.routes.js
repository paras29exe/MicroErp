import { Router } from "express";
import {
    createSale,
    getAllSales,
    getSaleById,
    removeSale,
} from "./sales.controller.js";
import { authorizePermission } from "../../middleware/role.middleware.js";

const router = Router();

// POST   /api/sales/add-sale          - create a new sale
// GET    /api/sales/get-sales         - list sales (paginated)
// GET    /api/sales/get-sale/:id      - get a single sale
// DELETE /api/sales/delete-sale/:id   - delete sale and restore stock

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
router.delete(
    "/delete-sale/:id",
    authorizePermission("sales:delete"),
    removeSale
);

export default router;