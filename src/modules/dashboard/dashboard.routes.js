import { Router } from "express";
import { authorizePermission } from "../../middleware/role.middleware.js";
import * as dashboardController from "./dashboard.controller.js";

const router = Router();

router.get("/overview", authorizePermission("dashboard:read"), dashboardController.getOverview);
router.get("/kpis", authorizePermission("dashboard:read"), dashboardController.getKpis);
router.get("/alerts", authorizePermission("dashboard:read"), dashboardController.getAlerts);

export default router;