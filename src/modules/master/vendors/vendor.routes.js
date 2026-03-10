import { Router } from "express";
import {
  addVendor,
  editVendor,
  getVendor,
  getVendors,
  removeVendor,
} from "./vendor.controller.js";

const router = Router();

// POST   /api/vendors          - create a vendor
// GET    /api/vendors          - list all vendors (optional ?name=...&email=...)
// GET    /api/vendors/:id      - get a single vendor
// PUT    /api/vendors/:id      - update vendor
// DELETE /api/vendors/:id      - delete a vendor

router.post("/add-vendor", addVendor);
router.get("/get-vendors", getVendors);
router.get("/get-vendor/:id", getVendor);
router.put("/update-vendor/:id", editVendor);
router.delete("/delete-vendor/:id", removeVendor);

export default router;
