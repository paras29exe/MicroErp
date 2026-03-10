import { Router } from "express";

const globalRouter = Router();

import productRouter from "../modules/master/products/product.routes.js";
import vendorRouter from "../modules/master/vendors/vendor.routes.js";

globalRouter.use("/products", productRouter);
globalRouter.use("/vendors", vendorRouter);

export default globalRouter;



