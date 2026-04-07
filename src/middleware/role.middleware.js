import { ApiError } from "../utils/response.js";
import prisma from "../config/db.js";

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

const PERMISSION_CATALOG = [
	"master:create",
	"master:read",
	"master:update",
	"master:delete",
	"sales:create",
	"sales:read",
	"sales:update",
	"sales:delete",
	"purchase:create",
	"purchase:read",
	"purchase:update",
	"purchase:delete",
	"inventory:read",
	"inventory:update",
	"production:create",
	"production:read",
	"production:update",
	"production:delete",
	"dashboard:read",
	"expense:create",
	"expense:read",
];

export const listPermissionCatalog = () => PERMISSION_CATALOG;

export const isValidPermission = (permission) =>
	typeof permission === "string" && PERMISSION_CATALOG.includes(permission);

export const getRoleDefaultPermissions = (role) => ROLE_PERMISSIONS[role] || [];

export const computeEffectivePermissions = ({ role, overrides = [] }) => {
	const roleDefaults = getRoleDefaultPermissions(role);

	const base = new Set(roleDefaults.includes("*") ? PERMISSION_CATALOG : roleDefaults);

	for (const override of overrides) {
		if (!isValidPermission(override.permission)) continue;

		if (override.effect === "DENY") {
			base.delete(override.permission);
			continue;
		}

		if (override.effect === "GRANT") {
			base.add(override.permission);
		}
	}

	return Array.from(base).sort();
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
	return async (req, res, next) => {
		if (!req.user) {
			return next(new ApiError(401, "Authentication required"));
		}

		if (!isValidPermission(permission)) {
			return next(new ApiError(500, `Unknown permission key: ${permission}`));
		}

		try {
			const activeOverrides = await prisma.userPermissionOverride.findMany({
				where: {
					userId: req.user.id,
					permission,
					revokedAt: null,
					OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
				},
				select: {
					effect: true,
				},
			});

			const hasDenyOverride = activeOverrides.some((override) => override.effect === "DENY");
			if (hasDenyOverride) {
				return next(new ApiError(403, "Access denied"));
			}

			const rolePermissions = ROLE_PERMISSIONS[req.user.role] || [];
			const allowedByRole = rolePermissions.includes("*") || rolePermissions.includes(permission);

			if (allowedByRole) {
				return next();
			}

			const hasGrantOverride = activeOverrides.some((override) => override.effect === "GRANT");
			if (hasGrantOverride) {
				return next();
			}

			return next(new ApiError(403, "Access denied"));
		} catch (err) {
			return next(err);
		}
	};
};

export const listRolePermissions = () => ROLE_PERMISSIONS;
