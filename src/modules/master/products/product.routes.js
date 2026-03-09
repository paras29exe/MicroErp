import { Router } from "express";
import { addProduct } from "./product.controller.js";

const router = Router();

router.post("/add-product", addProduct);

// https://microerpts/api/product/add-product
// https://microerpts/api/inventory/delete-product
// https://microerpts/api/sales/edit-product
// https://microerpts/api/purchase/view-product

export default router;