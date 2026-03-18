import bcrypt from "bcrypt";
import { ApiResponse, ApiError } from "../../utils/response.js";
import {
	createAccessToken,
	createRefreshToken,
	getAccessCookieOptions,
	getRefreshCookieOptions,
} from "../../utils/jwt.js";
import {
	getUserByEmailOrEmployeeId,
	saveRefreshToken,
	clearRefreshToken,
	getUserByRefreshToken,
} from "./auth.service.js";

const accessCookieName = "access_token";
const refreshCookieName = "refresh_token";

const sanitizeUser = (user) => ({
	id: user.id,
	employeeId: user.employeeId,
	name: user.name,
	email: user.email,
	role: user.role,
	isActive: user.isActive,
});

export const login = async (req, res, next) => {
	try {
		const { email, employeeId, password } = req.body;
		const normalizedEmail =
			email && typeof email === "string" ? email.toLowerCase().trim() : null;
		const normalizedEmployeeId =
			employeeId && typeof employeeId === "string"
				? employeeId.trim()
				: null;

		if (!normalizedEmail && !normalizedEmployeeId) {
			throw new ApiError(400, "Email or employeeId is required");
		}

		if (!password || typeof password !== "string") {
			throw new ApiError(400, "Password is required");
		}

		const user = await getUserByEmailOrEmployeeId({
			email: normalizedEmail,
			employeeId: normalizedEmployeeId,
		});

		if (!user || user.isDeleted) {
			throw new ApiError(401, "Invalid credentials");
		}

		if (!user.isActive) {
			throw new ApiError(403, "Account is deactivated");
		}

		const isMatch = await bcrypt.compare(password, user.passwordHash);
		if (!isMatch) {
			throw new ApiError(401, "Invalid credentials");
		}

		const accessToken = createAccessToken({
			id: user.id,
			role: user.role,
		});
		const { token: refreshToken, expiresAt } = createRefreshToken();

		await saveRefreshToken(user.id, refreshToken, expiresAt);

		res.cookie(accessCookieName, accessToken, getAccessCookieOptions());
		res.cookie(refreshCookieName, refreshToken, getRefreshCookieOptions());

		return res
			.status(200)
			.json(new ApiResponse(200, "Login successful", sanitizeUser(user)));
	} catch (err) {
		next(err);
	}
};

export const refresh = async (req, res, next) => {
	try {
		const token = req.cookies?.[refreshCookieName] || req.body?.refreshToken;

		if (!token) {
			throw new ApiError(401, "Refresh token is required");
		}

		const user = await getUserByRefreshToken(token);
		if (!user || user.isDeleted) {
			throw new ApiError(401, "Invalid refresh token");
		}

		if (!user.isActive) {
			throw new ApiError(403, "Account is deactivated");
		}

		if (!user.refreshTokenExpiresAt || user.refreshTokenExpiresAt < new Date()) {
			throw new ApiError(401, "Refresh token expired");
		}

		const accessToken = createAccessToken({
			id: user.id,
			role: user.role,
		});

		res.cookie(accessCookieName, accessToken, getAccessCookieOptions());

		return res
			.status(200)
			.json(new ApiResponse(200, "Token refreshed"));
	} catch (err) {
		next(err);
	}
};

export const logout = async (req, res, next) => {
	try {
		const userId = req.user?.id;
		if (userId) {
			await clearRefreshToken(userId);
		} else {
			const token = req.cookies?.[refreshCookieName];
			if (token) {
				const user = await getUserByRefreshToken(token);
				if (user) await clearRefreshToken(user.id);
			}
		}

		res.clearCookie(accessCookieName, getAccessCookieOptions());
		res.clearCookie(refreshCookieName, getRefreshCookieOptions());

		return res.status(200).json(new ApiResponse(200, "Logout successful"));
	} catch (err) {
		next(err);
	}
};
