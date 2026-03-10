import { Router } from "express";

const globalRouter = Router();

import productRouter from "../modules/master/products/product.routes.js";
import customerRouter from "../modules/master/customers/customer.routes.js";

globalRouter.use("/products", productRouter);
globalRouter.use("/customers", customerRouter);

export default globalRouter;

 

