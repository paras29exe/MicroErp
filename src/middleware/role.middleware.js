import { ApiError } from "../utils/response.js";

const ROLE_PERMISSIONS = {
	ADMIN: ["*"],
	SALES_MANAGER: [
		"master:read",
		"sales:create",
		"sales:read",
		"sales:update",
		"sales:delete",
		"inventory:read",
		"dashboard:read",
	],
	PURCHASE_MANAGER: [
		"master:read",
		"purchase:create",
		"purchase:read",
		"purchase:update",
		"purchase:delete",
		"inventory:read",

		"dashboard:read",
	],
	INVENTORY_MANAGER: [
		"master:read",
		"inventory:read",
		"inventory:update",
		"purchase:read",
		"sales:read",
		"production:read",
	
		"dashboard:read",
	],
	PRODUCTION_MANAGER: [
		"master:read",
		"production:create",
		"production:read",
		"production:update",
		"production:delete",
		"inventory:read",
		"inventory:update",
		"purchase:read",

		"dashboard:read",
	],
	ACCOUNTANT: [
		"master:read",
		"purchase:read",
		"sales:read",
		"inventory:read",
		"production:read",
		"expense:read",
		"expense:create",

		"dashboard:read",
	],
};

export const authorizeRoles = (...roles) => {
	return (req, res, next) => {
		if (!req.user) {
			return next(new ApiError(401, "Authentication required"));
		}

		if (!roles.includes(req.user.role)) {
			return next(new ApiError(403, "Access denied"));
		}

		return next();
	};
};

export const authorizePermission = (permission) => {
	return (req, res, next) => {
		if (!req.user) {
			return next(new ApiError(401, "Authentication required"));
		}

		const rolePermissions = ROLE_PERMISSIONS[req.user.role] || [];
		const isAllowed = rolePermissions.includes("*") || rolePermissions.includes(permission);

		if (!isAllowed) {
			return next(new ApiError(403, "Access denied"));
		}

		return next();
	};
};

export const listRolePermissions = () => ROLE_PERMISSIONS;
