import express from "express";
import {
    getAllInventory,
    getProductInventory,
    getLowStock,
    adjustStock,
    getSummary,
    updateReorderLevel,
} from "./inventory.controller.js";

const router = express.Router();

router.get("/", getAllInventory);
router.get("/low-stock", getLowStock);
router.get("/summary", getSummary);
router.get("/:productId", getProductInventory);
router.post("/adjust", adjustStock);
router.patch("/reorder-level/:productId", updateReorderLevel);

export default router;
