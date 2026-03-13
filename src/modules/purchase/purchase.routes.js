import { Router } from "express";
import {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePaymentStatus,
    deletePurchase,
} from "./purchase.controller.js";

const router = Router();

// POST   /api/purchases/add-purchase          - create a new purchase
// GET    /api/purchases/get-purchases         - list purchases (paginated)
// GET    /api/purchases/get-purchase/:id      - get a single purchase
// PUT    /api/purchases/update-payment-status/:id - update purchase payment status
// DELETE /api/purchases/delete-purchase/:id   - delete a purchase

router.post("/add-purchase", createPurchase);
router.get("/get-purchases", getAllPurchases);
router.get("/get-purchase/:id", getPurchaseById);
router.put("/update-payment-status/:id", updatePaymentStatus);
router.delete("/delete-purchase/:id", deletePurchase);

export default router;
