import prisma from "../../config/db.js";

export const getUserByEmail = async (email) => {
	return prisma.user.findUnique({ where: { email } });
};

export const getUserByEmailOrEmployeeId = async ({ email, employeeId }) => {
	const filters = [];
	if (email) {
		filters.push({ email });
	}
	if (employeeId) {
		filters.push({ employeeId });
	}

	if (filters.length === 0) return null;

	return prisma.user.findFirst({
		where: {
			OR: filters,
		},
	});
};

export const saveRefreshToken = async (userId, refreshToken, refreshTokenExpiresAt) => {
	return prisma.user.update({
		where: { id: userId },
		data: { refreshToken, refreshTokenExpiresAt },
	});
};

export const clearRefreshToken = async (userId) => {
	return prisma.user.update({
		where: { id: userId },
		data: { refreshToken: null, refreshTokenExpiresAt: null },
	});
};

export const getUserByRefreshToken = async (refreshToken) => {
	return prisma.user.findFirst({
		where: { refreshToken },
	});
};
