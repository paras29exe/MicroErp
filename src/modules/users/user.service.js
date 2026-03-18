import prisma from "../../config/db.js";

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
	return prisma.user.findMany({
		where: { isDeleted: false },
		orderBy: { createdAt: "desc" },
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
			role: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});
};

export const getUserById = async (id) => {
	return prisma.user.findFirst({
		where: { id, isDeleted: false },
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
			role: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});
};

export const getUserByEmail = async (email) => {
	return prisma.user.findUnique({ where: { email } });
};

export const updateUser = async (id, data) => {
	return prisma.user.update({
		where: { id },
		data,
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
			role: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
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
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
			role: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
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
		select: {
			id: true,
			employeeId: true,
			name: true,
			email: true,
			role: true,
			isActive: true,
			createdAt: true,
			updatedAt: true,
		},
	});
};
