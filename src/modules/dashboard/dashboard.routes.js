import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware.js";
import { authorizePermission } from "../../middleware/role.middleware.js";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get("/overview", authenticate, authorizePermission("dashboard:read"), dashboardController.getOverview);
router.get("/kpis", authenticate, authorizePermission("dashboard:read"), dashboardController.getKpis);
router.get("/alerts", authenticate, authorizePermission("dashboard:read"), dashboardController.getAlerts);

export default router;