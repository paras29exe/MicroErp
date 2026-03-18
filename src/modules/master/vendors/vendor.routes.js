import { Router } from "express";
import {
  addVendor,
  editVendor,
  getVendor,
  getVendors,
  removeVendor,
} from "./vendor.controller.js";
import { authorizePermission } from "../../../middleware/role.middleware.js";

const router = Router();

// POST   /api/vendors          - create a vendor
// GET    /api/vendors          - list all vendors (optional ?name=...&email=...)
// GET    /api/vendors/:id      - get a single vendor
// PUT    /api/vendors/:id      - update vendor
// DELETE /api/vendors/:id      - delete a vendor

router.post(
  "/add-vendor",
  authorizePermission("master:create"),
  addVendor
);
router.get(
  "/get-vendors",
  authorizePermission("master:read"),
  getVendors
);
router.get(
  "/get-vendor/:id",
  authorizePermission("master:read"),
  getVendor
);
router.put(
  "/update-vendor/:id",
  authorizePermission("master:update"),
  editVendor
);
router.delete(
  "/delete-vendor/:id",
  authorizePermission("master:delete"),
  removeVendor
);

export default router;
