import { Router } from "express";
import { addProduct, getProducts, getProduct, editProduct, removeProduct } from "./product.controller.js";

const router = Router();

// POST   /api/products          - create a new product (master data)
// GET    /api/products          - list all products (optional ?category=raw|wip|finished)
// GET    /api/products/:id      - get a single product
// PUT    /api/products/:id      - update product master data
// DELETE /api/products/:id      - delete a product

router.post("/add-product", addProduct);
router.get("/get-products", getProducts);
router.get("/get-product/:id", getProduct);
router.put("/update-product/:id", editProduct);
router.delete("/delete-product/:id", removeProduct);

export default router;