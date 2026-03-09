import { Router } from "express";

const globalRouter = Router();

import productRouter from "../modules/master/products/product.routes.js";

globalRouter.use("/products", productRouter);

export default globalRouter;



