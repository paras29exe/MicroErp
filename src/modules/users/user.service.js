import prisma from "../../config/db.js";
import {
	computeEffectivePermissions,
	getRoleDefaultPermissions,
	listPermissionCatalog,
} from "../../middleware/role.middleware.js";

const USER_SELECT = {
	id: true,
	employeeId: true,
	name: true,
	email: true,
	role: true,
	isActive: true,
	isDeleted: true,
	deactivatedAt: true,
	deletedAt: true,
	createdAt: true,
	updatedAt: true,
};

const SORTABLE_FIELDS = {
	employeeId: "employeeId",
	name: "name",
	email: "email",
	role: "role",
	isActive: "isActive",
	createdAt: "createdAt",
	updatedAt: "updatedAt",
};

export const createUser = async ({ employeeId, name, email, passwordHash, role }) => {
	return prisma.user.create({
		data: {
			employeeId,
			name,
			email,
			passwordHash,
			role,
		},
	});
};

export const getUsers = async () => {
	return getUsersWithQuery({});
};

export const getUsersWithQuery = async ({
	page = 1,
	pageSize = 20,
	search,
	role,
	status = "all",
	sortBy = "createdAt",
	sortOrder = "desc",
}) => {
	const safePage = Number.isInteger(page) && page > 0 ? page : 1;
	const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;

	const where = {};

	if (status === "deleted") {
		where.isDeleted = true;
	}

	if (status === "active" || status === "inactive") {
		where.isDeleted = false;
	}

	if (role) {
		where.role = role;
	}

	if (status === "active") {
		where.isActive = true;
	}

	if (status === "inactive") {
		where.isActive = false;
	}

	if (search) {
		where.OR = [
			{ employeeId: { contains: search, mode: "insensitive" } },
			{ name: { contains: search, mode: "insensitive" } },
			{ email: { contains: search, mode: "insensitive" } },
		];
	}

	const sortField = SORTABLE_FIELDS[sortBy] || "createdAt";
	const safeSortOrder = sortOrder === "asc" ? "asc" : "desc";

	const [total, items] = await prisma.$transaction([
		prisma.user.count({ where }),
		prisma.user.findMany({
			where,
			orderBy: [{ [sortField]: safeSortOrder }, { id: "desc" }],
			skip: (safePage - 1) * safePageSize,
			take: safePageSize,
			select: USER_SELECT,
		}),
	]);

	const totalPages = Math.max(1, Math.ceil(total / safePageSize));

	return {
		items,
		meta: {
			page: safePage,
			pageSize: safePageSize,
			total,
			totalPages,
		},
	};
};

export const getUserById = async (id) => {
	return prisma.user.findFirst({
		where: { id, isDeleted: false },
		select: USER_SELECT,
	});
};

export const getUserByIdAnyState = async (id) => {
	return prisma.user.findUnique({
		where: { id },
		select: USER_SELECT,
	});
};

export const getUserByEmail = async (email) => {
	return prisma.user.findUnique({ where: { email } });
};

export const updateUser = async (id, data) => {
	return prisma.user.update({
		where: { id },
		data,
		select: USER_SELECT,
	});
};

export const deactivateUser = async (id) => {
	return prisma.user.update({
		where: { id },
		data: {
			isActive: false,
			deactivatedAt: new Date(),
			refreshToken: null,
			refreshTokenExpiresAt: null,
		},
		select: USER_SELECT,
	});
};

export const deleteUser = async (id) => {
	return prisma.user.update({
		where: { id },
		data: {
			isDeleted: true,
			deletedAt: new Date(),
			isActive: false,
			refreshToken: null,
			refreshTokenExpiresAt: null,
		},
		select: USER_SELECT,
	});
};

export const getUserAuthById = async (id) => {
	return prisma.user.findUnique({
		where: { id },
		select: {
			id: true,
			passwordHash: true,
			isDeleted: true,
		},
	});
};

export const createUserAuditLog = async ({ userId, actorUserId, action, details }) => {
	return prisma.userAudit.create({
		data: {
			userId,
			actorUserId: actorUserId ?? null,
			action,
			details: details ?? null,
		},
	});
};

export const getUserAuditLogs = async (userId, { page = 1, pageSize = 20 } = {}) => {
	const safePage = Number.isInteger(page) && page > 0 ? page : 1;
	const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 20;

	const [total, items] = await prisma.$transaction([
		prisma.userAudit.count({ where: { userId } }),
		prisma.userAudit.findMany({
			where: { userId },
			orderBy: [{ createdAt: "desc" }, { id: "desc" }],
			skip: (safePage - 1) * safePageSize,
			take: safePageSize,
			select: {
				id: true,
				action: true,
				details: true,
				createdAt: true,
				actor: {
					select: {
						id: true,
						name: true,
						email: true,
						employeeId: true,
						role: true,
					},
				},
			},
		}),
	]);

	return {
		items,
		meta: {
			page: safePage,
			pageSize: safePageSize,
			total,
			totalPages: Math.max(1, Math.ceil(total / safePageSize)),
		},
	};
};

export const getUserPermissionOverrides = async (
	userId,
	{ includeRevoked = false, includeExpired = false } = {},
) => {
	return prisma.userPermissionOverride.findMany({
		where: {
			userId,
			...(includeRevoked ? {} : { revokedAt: null }),
			...(includeExpired
				? {}
				: {
					OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
				}),
		},
		orderBy: [{ createdAt: "desc" }, { id: "desc" }],
		select: {
			id: true,
			permission: true,
			effect: true,
			expiresAt: true,
			reason: true,
			createdAt: true,
			revokedAt: true,
			createdBy: {
				select: {
					id: true,
					name: true,
					email: true,
					employeeId: true,
					role: true,
				},
			},
			revokedBy: {
				select: {
					id: true,
					name: true,
					email: true,
					employeeId: true,
					role: true,
				},
			},
		},
	});
};

export const findActivePermissionOverride = async ({
	userId,
	permission,
	effect,
}) => {
	return prisma.userPermissionOverride.findFirst({
		where: {
			userId,
			permission,
			effect,
			revokedAt: null,
			OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
		},
		select: { id: true },
	});
};

export const createPermissionOverride = async ({
	userId,
	permission,
	effect,
	expiresAt,
	reason,
	createdById,
}) => {
	return prisma.userPermissionOverride.create({
		data: {
			userId,
			permission,
			effect,
			expiresAt: expiresAt ?? null,
			reason: reason ?? null,
			createdById,
		},
		select: {
			id: true,
			userId: true,
			permission: true,
			effect: true,
			expiresAt: true,
			reason: true,
			createdById: true,
			createdAt: true,
			revokedById: true,
			revokedAt: true,
		},
	});
};

export const revokePermissionOverride = async ({
	userId,
	overrideId,
	revokedById,
}) => {
	return prisma.userPermissionOverride.updateMany({
		where: {
			id: overrideId,
			userId,
			revokedAt: null,
		},
		data: {
			revokedAt: new Date(),
			revokedById,
		},
	});
};

export const getEffectivePermissionsByUserId = async (userId) => {
	const user = await prisma.user.findFirst({
		where: { id: userId, isDeleted: false },
		select: {
			id: true,
			role: true,
			permissionOverrides: {
				where: {
					revokedAt: null,
					OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
				},
				orderBy: [{ createdAt: "desc" }, { id: "desc" }],
				select: {
					id: true,
					permission: true,
					effect: true,
					expiresAt: true,
					reason: true,
					createdAt: true,
				},
			},
		},
	});

	if (!user) return null;

	const defaultPermissions = getRoleDefaultPermissions(user.role);
	const effectivePermissions = computeEffectivePermissions({
		role: user.role,
		overrides: user.permissionOverrides,
	});

	return {
		userId: user.id,
		role: user.role,
		permissionCatalog: listPermissionCatalog(),
		defaultPermissions,
		overrides: user.permissionOverrides,
		effectivePermissions,
	};
};
