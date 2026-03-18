import prisma from "../config/db.js";
import { ApiError } from "../utils/response.js";
import { verifyAccessToken } from "../utils/jwt.js";

export const authenticate = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization || "";
		const tokenFromHeader = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
		const tokenFromCookie = req.cookies?.access_token || null;
		const token = tokenFromHeader || tokenFromCookie;

		if (!token) {
			throw new ApiError(401, "Authentication required");
		}

		const payload = verifyAccessToken(token);
		const user = await prisma.user.findUnique({
			where: { id: payload.id },
			select: {
				id: true,
				name: true,
				email: true,
				role: true,
				isActive: true,
				isDeleted: true,
			},
		});

		if (!user || user.isDeleted) {
			throw new ApiError(401, "Invalid authentication session");
		}

		if (!user.isActive) {
			throw new ApiError(403, "Account is deactivated");
		}

		req.user = user;
		next();
	} catch (err) {
		if (err instanceof ApiError) return next(err);
		return next(new ApiError(401, "Invalid or expired token"));
	}
};
