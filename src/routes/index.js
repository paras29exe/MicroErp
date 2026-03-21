import { Router } from "express";

const globalRouter = Router();

import productRouter from "../modules/master/products/product.routes.js";
import vendorRouter from "../modules/master/vendors/vendor.routes.js";
import customerRouter from "../modules/master/customers/customer.routes.js";
import purchaseRouter from "../modules/purchase/purchase.routes.js";
import inventoryRouter from "../modules/inventory/inventory.routes.js";
import productionRouter from "../modules/production/production.routes.js";
import authRouter from "../modules/auth/auth.routes.js";
import userRouter from "../modules/users/user.routes.js";
import { authenticate } from "../middleware/auth.middleware.js";

globalRouter.use("/auth", authRouter);

globalRouter.use("/products", authenticate, productRouter);
globalRouter.use("/vendors", authenticate, vendorRouter);
globalRouter.use("/customers", authenticate, customerRouter);
globalRouter.use("/purchases", authenticate, purchaseRouter);
globalRouter.use("/inventory", authenticate, inventoryRouter);
globalRouter.use("/production", authenticate, productionRouter);
globalRouter.use("/users", authenticate, userRouter);

export default globalRouter;



