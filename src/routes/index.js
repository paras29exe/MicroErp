import { Router } from "express";

const globalRouter = Router();

import productRouter from "../modules/master/products/product.routes.js";
import vendorRouter from "../modules/master/vendors/vendor.routes.js";
import customerRouter from "../modules/master/customers/customer.routes.js";
import purchaseRouter from "../modules/purchase/purchase.routes.js";

globalRouter.use("/products", productRouter);
globalRouter.use("/vendors", vendorRouter);
globalRouter.use("/customers", customerRouter);
globalRouter.use("/purchases", purchaseRouter);

export default globalRouter;

 

