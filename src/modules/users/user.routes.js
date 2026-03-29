import { Router } from "express";
import {
	createUser,
	getUsers,
	getUserById,
	updateUser,
	deactivateUser,
	deleteUser,
	getMe,
	updateMe,
	getUserAuditLogs,
} from "./user.controller.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = Router();

router.get("/me", getMe);
router.patch("/update-me", updateMe);

router.post("/create-user", authorizeRoles("ADMIN"), createUser);
router.get("/get-users", authorizeRoles("ADMIN"), getUsers);
router.get("/get-user/:id", authorizeRoles("ADMIN"), getUserById);
router.get("/get-user-audit/:id", authorizeRoles("ADMIN"), getUserAuditLogs);
router.put("/update-user/:id", authorizeRoles("ADMIN"), updateUser);
router.patch("/deactivate-user/:id", authorizeRoles("ADMIN"), deactivateUser);
router.delete("/delete-user/:id", authorizeRoles("ADMIN"), deleteUser);

export default router;
