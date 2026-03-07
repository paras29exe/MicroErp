import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct
} from "../controllers/productController.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.put("/:id", updateProduct);

export default router;