import express from "express";
import {
    getAllInventory,
    getProductInventory,
    getLowStock,
    adjustStock,
    getSummary,
    getTransactions,
    updateReorderLevel,
} from "./inventory.controller.js";
import { authorizePermission } from "../../middleware/role.middleware.js";

const router = express.Router();

router.get("/", authorizePermission("inventory:read"), getAllInventory);
router.get("/low-stock", authorizePermission("inventory:read"), getLowStock);
router.get("/summary", authorizePermission("inventory:read"), getSummary);
router.get("/transactions", authorizePermission("inventory:read"), getTransactions);
router.get("/:productId", authorizePermission("inventory:read"), getProductInventory);
router.post("/adjust", authorizePermission("inventory:update"), adjustStock);

router.patch(
    "/reorder-level/:productId",
    authorizePermission("inventory:update"),
    updateReorderLevel
);

export default router;
