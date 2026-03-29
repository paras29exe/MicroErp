import bcrypt from "bcrypt";
import { ApiResponse, ApiError } from "../../utils/response.js";
import {
	createUser as createUserService,
	getUsersWithQuery as getUsersWithQueryService,
	getUserById as getUserByIdService,
	getUserByEmail as getUserByEmailService,
	updateUser as updateUserService,
	deactivateUser as deactivateUserService,
	deleteUser as deleteUserService,
	getUserAuthById as getUserAuthByIdService,
	createUserAuditLog as createUserAuditLogService,
	getUserAuditLogs as getUserAuditLogsService,
} from "./user.service.js";
import prisma from "../../config/db.js";
import {
	VALID_ROLES,
	isValidRole,
	validatePasswordStrength,
} from "./user.validation.js";

function parsePositiveInt(value, fallback) {
	const parsed = Number.parseInt(value, 10);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function pickChangedFields(existing, nextValues, keys) {
	const changed = {};

	keys.forEach((key) => {
		if (nextValues[key] !== undefined && nextValues[key] !== existing[key]) {
			changed[key] = {
				from: existing[key],
				to: nextValues[key],
			};
		}
	});

	return changed;
}

export const createUser = async (req, res, next) => {
	try {
		const { employeeId, name, email, password, role } = req.body;

		if (!employeeId || typeof employeeId !== "string" || employeeId.trim() === "") {
			throw new ApiError(400, "employeeId is required");
		}

		// check existing employeeid
		const existingEmployee = await prisma.user.findFirst({
			where: {
				employeeId: employeeId.trim(),
			},
		});
		if (existingEmployee) {
			throw new ApiError(409, "Employee ID already exists");
		}


		if (!name || typeof name !== "string" || name.trim() === "") {
			throw new ApiError(400, "name is required");
		}

		if (!email || typeof email !== "string") {
			throw new ApiError(400, "email is required");
		}

		if (!password) {
			throw new ApiError(400, "password is required");
		}

		const passwordValidation = validatePasswordStrength(password);
		if (!passwordValidation.valid) {
			throw new ApiError(400, passwordValidation.message);
		}

		if (!role || !isValidRole(role)) {
			throw new ApiError(400, `role must be one of: ${VALID_ROLES.join(", ")}`);
		}

		const existing = await getUserByEmailService(email.toLowerCase());
		if (existing) {
			throw new ApiError(409, "Email already exists");
		}

		const passwordHash = await bcrypt.hash(password, 10);
		const data = await createUserService({
			employeeId: employeeId.trim(),
			name: name.trim(),
			email: email.toLowerCase(),
			passwordHash,
			role,
		});

		await createUserAuditLogService({
			userId: data.id,
			actorUserId: req.user?.id,
			action: "USER_CREATED",
			details: {
				createdFields: {
					employeeId: data.employeeId,
					name: data.name,
					email: data.email,
					role: data.role,
				},
			},
		});

		return res
			.status(201)
			.json(new ApiResponse(201, "User created successfully", data));
	} catch (err) {
		next(err);
	}
};

export const getUsers = async (req, res, next) => {
	try {
		const page = parsePositiveInt(req.query.page, 1);
		const pageSize = parsePositiveInt(req.query.pageSize, 20);
		const search =
			typeof req.query.search === "string" && req.query.search.trim()
				? req.query.search.trim()
				: undefined;
		const role =
			typeof req.query.role === "string" && req.query.role.trim()
				? req.query.role.trim().toUpperCase()
				: undefined;
		const status =
			typeof req.query.status === "string" && ["all", "active", "inactive"].includes(req.query.status)
				? req.query.status
				: "all";
		const sortBy =
			typeof req.query.sortBy === "string" ? req.query.sortBy : "createdAt";
		const sortOrder = req.query.sortOrder === "asc" ? "asc" : "desc";

		if (role && !isValidRole(role)) {
			throw new ApiError(400, `role must be one of: ${VALID_ROLES.join(", ")}`);
		}

		const data = await getUsersWithQueryService({
			page,
			pageSize,
			search,
			role,
			status,
			sortBy,
			sortOrder,
		});
		return res
			.status(200)
			.json(new ApiResponse(200, "Users retrieved successfully", data));
	} catch (err) {
		next(err);
	}
};

export const getUserById = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) throw new ApiError(400, "Invalid user ID");

		const data = await getUserByIdService(id);
		if (!data) throw new ApiError(404, "User not found");

		return res
			.status(200)
			.json(new ApiResponse(200, "User retrieved successfully", data));
	} catch (err) {
		next(err);
	}
};

export const updateUser = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) throw new ApiError(400, "Invalid user ID");

		const existingUser = await getUserByIdService(id);
		if (!existingUser) throw new ApiError(404, "User not found");

		const { employeeId, name, email, role, password, isActive } = req.body;

		if (role !== undefined && !isValidRole(role)) {
			throw new ApiError(400, `role must be one of: ${VALID_ROLES.join(", ")}`);
		}

		if (email !== undefined && (typeof email !== "string" || email.trim() === "")) {
			throw new ApiError(400, "email cannot be empty");
		}

		if (employeeId !== undefined && (typeof employeeId !== "string" || employeeId.trim() === "")) {
			throw new ApiError(400, "employeeId cannot be empty");
		}

		if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
			throw new ApiError(400, "name cannot be empty");
		}

		if (password !== undefined) {
			const passwordValidation = validatePasswordStrength(password);
			if (!passwordValidation.valid) {
				throw new ApiError(400, passwordValidation.message);
			}
		}

		if (email !== undefined) {
			const existing = await getUserByEmailService(email.toLowerCase());
			if (existing && existing.id !== id) {
				throw new ApiError(409, "Email already exists");
			}
		}

		if (employeeId !== undefined) {
			const existingEmployee = await prisma.user.findFirst({
				where: {
					employeeId: employeeId.trim(),
					id: { not: id },
					isDeleted: false,
				},
				select: { id: true },
			});

			if (existingEmployee) {
				throw new ApiError(409, "Employee ID already exists");
			}
		}

		const data = {
			...(employeeId !== undefined && { employeeId: employeeId.trim() }),
			...(name !== undefined && { name: name.trim() }),
			...(email !== undefined && { email: email.toLowerCase() }),
			...(role !== undefined && { role }),
			...(isActive !== undefined && {
				isActive: Boolean(isActive),
				deactivatedAt: Boolean(isActive) ? null : new Date(),
			}),
		};

		if (password !== undefined) {
			data.passwordHash = await bcrypt.hash(password, 10);
		}

		const updated = await updateUserService(id, data);

		const changedFields = pickChangedFields(
			existingUser,
			{
				employeeId: updated.employeeId,
				name: updated.name,
				email: updated.email,
				role: updated.role,
				isActive: updated.isActive,
			},
			["employeeId", "name", "email", "role", "isActive"]
		);

		const hasChangedFields = Object.keys(changedFields).length > 0;
		const passwordChanged = password !== undefined;

		if (hasChangedFields || passwordChanged) {
			let action = "USER_UPDATED";
			const details = {
				changedFields,
				passwordChanged,
			};

			if (existingUser.role !== updated.role) {
				action = "ROLE_CHANGED";
				details.from = existingUser.role;
				details.to = updated.role;
			} else if (existingUser.isActive !== updated.isActive) {
				action = updated.isActive ? "USER_ACTIVATED" : "USER_DEACTIVATED";
				details.from = existingUser.isActive;
				details.to = updated.isActive;
			} else if (passwordChanged) {
				action = "PASSWORD_CHANGED";
				details.changedByAdmin = true;
			}

			await createUserAuditLogService({
				userId: updated.id,
				actorUserId: req.user?.id,
				action,
				details,
			});
		}

		return res
			.status(200)
			.json(new ApiResponse(200, "User updated successfully", updated));
	} catch (err) {
		next(err);
	}
};

export const deactivateUser = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) throw new ApiError(400, "Invalid user ID");

		const existingUser = await getUserByIdService(id);
		if (!existingUser) throw new ApiError(404, "User not found");

		const updated = await deactivateUserService(id);

		if (existingUser.isActive) {
			await createUserAuditLogService({
				userId: updated.id,
				actorUserId: req.user?.id,
				action: "USER_DEACTIVATED",
				details: {
					from: true,
					to: false,
				},
			});
		}

		return res
			.status(200)
			.json(new ApiResponse(200, "User deactivated successfully", updated));
	} catch (err) {
		next(err);
	}
};

export const deleteUser = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) throw new ApiError(400, "Invalid user ID");

		const existingUser = await getUserByIdService(id);
		if (!existingUser) throw new ApiError(404, "User not found");

		const deleted = await deleteUserService(id);

		await createUserAuditLogService({
			userId: deleted.id,
			actorUserId: req.user?.id,
			action: "USER_DELETED",
			details: {
				softDelete: true,
			},
		});

		return res
			.status(200)
			.json(new ApiResponse(200, "User deleted successfully", deleted));
	} catch (err) {
		next(err);
	}
};

export const getMe = async (req, res, next) => {
	try {
		const data = await getUserByIdService(req.user.id);
		if (!data) throw new ApiError(404, "User not found");

		return res
			.status(200)
			.json(new ApiResponse(200, "Profile retrieved successfully", data));
	} catch (err) {
		next(err);
	}
};

export const updateMe = async (req, res, next) => {
	try {
		const { name, email, password, currentPassword } = req.body;

		if (email !== undefined && (typeof email !== "string" || email.trim() === "")) {
			throw new ApiError(400, "email cannot be empty");
		}

		if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
			throw new ApiError(400, "name cannot be empty");
		}

		if (password !== undefined) {
			const passwordValidation = validatePasswordStrength(password);
			if (!passwordValidation.valid) {
				throw new ApiError(400, passwordValidation.message);
			}

			if (!currentPassword || typeof currentPassword !== "string") {
				throw new ApiError(400, "currentPassword is required to change password");
			}

			const authUser = await getUserAuthByIdService(req.user.id);
			if (!authUser || authUser.isDeleted) {
				throw new ApiError(404, "User not found");
			}

			const isCurrentPasswordValid = await bcrypt.compare(currentPassword, authUser.passwordHash);
			if (!isCurrentPasswordValid) {
				throw new ApiError(401, "Current password is incorrect");
			}

			const isSamePassword = await bcrypt.compare(password, authUser.passwordHash);
			if (isSamePassword) {
				throw new ApiError(400, "New password must be different from current password");
			}
		}

		if (email !== undefined) {
			const existing = await getUserByEmailService(email.toLowerCase());
			if (existing && existing.id !== req.user.id) {
				throw new ApiError(409, "Email already exists");
			}
		}

		const existingUser = await getUserByIdService(req.user.id);
		if (!existingUser) {
			throw new ApiError(404, "User not found");
		}

		const data = {
			...(name !== undefined && { name: name.trim() }),
			...(email !== undefined && { email: email.toLowerCase() }),
		};

		if (password !== undefined) {
			data.passwordHash = await bcrypt.hash(password, 10);
		}

		const updated = await updateUserService(req.user.id, data);

		const changedFields = pickChangedFields(
			existingUser,
			{
				name: updated.name,
				email: updated.email,
			},
			["name", "email"]
		);

		const hasChangedFields = Object.keys(changedFields).length > 0;
		const passwordChanged = password !== undefined;

		if (hasChangedFields || passwordChanged) {
			const action = passwordChanged ? "PASSWORD_CHANGED" : "PROFILE_UPDATED";
			const details = {
				changedFields,
				passwordChanged,
				...(passwordChanged ? { changedByAdmin: false } : {}),
			};

			await createUserAuditLogService({
				userId: updated.id,
				actorUserId: req.user?.id,
				action,
				details,
			});
		}

		return res
			.status(200)
			.json(new ApiResponse(200, "Profile updated successfully", updated));
	} catch (err) {
		next(err);
	}
};

export const getUserAuditLogs = async (req, res, next) => {
	try {
		const id = parseInt(req.params.id);
		if (Number.isNaN(id)) throw new ApiError(400, "Invalid user ID");

		const existingUser = await getUserByIdService(id);
		if (!existingUser) throw new ApiError(404, "User not found");

		const page = parsePositiveInt(req.query.page, 1);
		const pageSize = parsePositiveInt(req.query.pageSize, 20);

		const data = await getUserAuditLogsService(id, { page, pageSize });

		return res
			.status(200)
			.json(new ApiResponse(200, "User audit logs retrieved successfully", data));
	} catch (err) {
		next(err);
	}
};
