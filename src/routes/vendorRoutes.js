import express from "express";
import {
  createVendor,
  getVendors,
  updateVendor,
  deleteVendor
} from "../controllers/vendorController.js";

const router = express.Router();

router.post("/", createVendor);
router.get("/", getVendors);
router.put("/:id", updateVendor);
router.delete("/:id", deleteVendor);

export default router;