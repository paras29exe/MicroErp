import bcrypt from "bcrypt";
import { ApiResponse, ApiError } from "../../utils/response.js";
import {
	createUser as createUserService,
	getUsers as getUsersService,
	getUserById as getUserByIdService,
	getUserByEmail as getUserByEmailService,
	updateUser as updateUserService,
	deactivateUser as deactivateUserService,
	deleteUser as deleteUserService,
} from "./user.service.js";
import prisma from "../../config/db.js";

const VALID_ROLES = [
	"ADMIN",
	"SALES_MANAGER",
	"PURCHASE_MANAGER",
	"INVENTORY_MANAGER",
	"PRODUCTION_MANAGER",
	"ACCOUNTANT",
];

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

		if (!password || typeof password !== "string" || password.length < 6) {
			throw new ApiError(400, "password must be at least 6 characters");
		}

		if (!role || !VALID_ROLES.includes(role)) {
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

		return res
			.status(201)
			.json(new ApiResponse(201, "User created successfully", data));
	} catch (err) {
		next(err);
	}
};

export const getUsers = async (req, res, next) => {
	try {
		const data = await getUsersService();
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

		if (role !== undefined && !VALID_ROLES.includes(role)) {
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

		if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
			throw new ApiError(400, "password must be at least 6 characters");
		}

		if (email !== undefined) {
			const existing = await getUserByEmailService(email.toLowerCase());
			if (existing && existing.id !== id) {
				throw new ApiError(409, "Email already exists");
			}
		}

		const data = {
			...(employeeId !== undefined && { employeeId: employeeId.trim() }),
			...(name !== undefined && { name: name.trim() }),
			...(email !== undefined && { email: email.toLowerCase() }),
			...(role !== undefined && { role }),
			...(isActive !== undefined && { isActive: Boolean(isActive) }),
		};

		if (password !== undefined) {
			data.passwordHash = await bcrypt.hash(password, 10);
		}

		const updated = await updateUserService(id, data);

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
		const { name, email, password } = req.body;

		if (email !== undefined && (typeof email !== "string" || email.trim() === "")) {
			throw new ApiError(400, "email cannot be empty");
		}

		if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
			throw new ApiError(400, "name cannot be empty");
		}

		if (password !== undefined && (typeof password !== "string" || password.length < 6)) {
			throw new ApiError(400, "password must be at least 6 characters");
		}

		if (email !== undefined) {
			const existing = await getUserByEmailService(email.toLowerCase());
			if (existing && existing.id !== req.user.id) {
				throw new ApiError(409, "Email already exists");
			}
		}

		const data = {
			...(name !== undefined && { name: name.trim() }),
			...(email !== undefined && { email: email.toLowerCase() }),
		};

		if (password !== undefined) {
			data.passwordHash = await bcrypt.hash(password, 10);
		}

		const updated = await updateUserService(req.user.id, data);

		return res
			.status(200)
			.json(new ApiResponse(200, "Profile updated successfully", updated));
	} catch (err) {
		next(err);
	}
};
