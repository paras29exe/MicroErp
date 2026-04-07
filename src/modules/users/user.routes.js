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
	getUserOverrides,
	createUserOverride,
	revokeUserOverride,
	getUserEffectivePermissions,
	getMeEffectivePermissions,
} from "./user.controller.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = Router();

router.get("/me", getMe);
router.patch("/update-me", updateMe);
router.get("/me/effective-permissions", getMeEffectivePermissions);

router.post("/create-user", authorizeRoles("ADMIN"), createUser);
router.get("/get-users", authorizeRoles("ADMIN"), getUsers);
router.get("/get-user/:id", authorizeRoles("ADMIN"), getUserById);
router.get("/get-user-audit/:id", authorizeRoles("ADMIN"), getUserAuditLogs);
router.get("/get-user-overrides/:id", authorizeRoles("ADMIN"), getUserOverrides);
router.post("/add-user-override/:id", authorizeRoles("ADMIN"), createUserOverride);
router.patch("/revoke-user-override/:id/:overrideId", authorizeRoles("ADMIN"), revokeUserOverride);
router.get("/get-user-permissions/:id", authorizeRoles("ADMIN"), getUserEffectivePermissions);
router.put("/update-user/:id", authorizeRoles("ADMIN"), updateUser);
router.patch("/deactivate-user/:id", authorizeRoles("ADMIN"), deactivateUser);
router.delete("/delete-user/:id", authorizeRoles("ADMIN"), deleteUser);

export default router;
