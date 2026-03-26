import { Router } from "express";
import {
	addProduct,
	getProducts,
	getProduct,
	editProduct,
	removeProduct,
	getFinishedProductsWithStock,
} from "./product.controller.js";
import { authorizePermission } from "../../../middleware/role.middleware.js";

const router = Router();

// POST   /api/products          - create a new product (master data)
// GET    /api/products          - list products (optional ?category=raw|wip|finished&search=term or ?name=term&page=1&pageSize=20)
// GET    /api/products/:id      - get a single product
// PUT    /api/products/:id      - update product master data
// DELETE /api/products/:id      - delete a product

router.post(
	"/add-product",
	authorizePermission("master:create"),
	addProduct
);
router.get(
	"/get-products",
	authorizePermission("master:read"),
	getProducts
);
router.get(
	"/get-product/:id",
	authorizePermission("master:read"),
	getProduct
);
router.get(
	"/get-finished-products-stock",
	authorizePermission("master:read"),
	getFinishedProductsWithStock
);
router.put(
	"/update-product/:id",
	authorizePermission("master:update"),
	editProduct
);
router.delete(
	"/delete-product/:id",
	authorizePermission("master:delete"),
	removeProduct
);

export default router;