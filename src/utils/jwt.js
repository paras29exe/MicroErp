import jwt from "jsonwebtoken";
import crypto from "crypto";

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN;
const ACCESS_TOKEN_EXPIRES_MINUTES = parseInt(process.env.JWT_ACCESS_EXPIRES_MINUTES, 10);

const REFRESH_TOKEN_EXPIRES_DAYS = parseInt(process.env.JWT_REFRESH_EXPIRES_DAYS, 10);

export const createAccessToken = (payload) => {
	return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
		expiresIn: ACCESS_TOKEN_EXPIRES_IN,
	});
};

export const verifyAccessToken = (token) => {
	return jwt.verify(token, ACCESS_TOKEN_SECRET);
};

export const createRefreshToken = () => {
	const token = crypto.randomBytes(48).toString("hex");
	const expiresAt = new Date(
		Date.now() + REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
	);

	return { token, expiresAt };
};

export const getAccessCookieOptions = () => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax",
	maxAge: ACCESS_TOKEN_EXPIRES_MINUTES * 60 * 1000,
});

export const getRefreshCookieOptions = () => ({
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "lax",
	maxAge: REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000,
});
