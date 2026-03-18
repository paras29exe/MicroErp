import { Router } from "express";
import {
    createPurchase,
    getAllPurchases,
    getPurchaseById,
    updatePaymentStatus,
    deletePurchase,
} from "./purchase.controller.js";
import { authorizePermission } from "../../middleware/role.middleware.js";

const router = Router();

// POST   /api/purchases/add-purchase          - create a new purchase
// GET    /api/purchases/get-purchases         - list purchases (paginated)
// GET    /api/purchases/get-purchase/:id      - get a single purchase
// PUT    /api/purchases/update-payment-status/:id - update purchase payment status
// DELETE /api/purchases/delete-purchase/:id   - delete a purchase

router.post(
    "/add-purchase",
    authorizePermission("purchase:create"),
    createPurchase
);
router.get(
    "/get-purchases",
    authorizePermission("purchase:read"),
    getAllPurchases
);
router.get(
    "/get-purchase/:id",
    authorizePermission("purchase:read"),
    getPurchaseById
);
router.put(
    "/update-payment-status/:id",
    authorizePermission("purchase:update"),
    updatePaymentStatus
);
router.delete(
    "/delete-purchase/:id",
    authorizePermission("purchase:delete"),  
    deletePurchase
);

export default router;
