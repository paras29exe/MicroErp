import { ApiError } from "../utils/response.js";
import { Prisma } from "@prisma/client";

export const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
        });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === "P2002") {
            return res.status(409).json({
                success: false,
                statusCode: 409,
                message: "Duplicate value violates a unique constraint",
            });
        }

        if (err.code === "P2003") {
            return res.status(400).json({
                success: false,
                statusCode: 400,
                message: "Referenced record does not exist or is invalid",
            });
        }

        if (err.code === "P2025") {
            return res.status(404).json({
                success: false,
                statusCode: 404,
                message: "Requested record was not found",
            });
        }

        if (err.code === "P2028") {
            return res.status(503).json({
                success: false,
                statusCode: 503,
                message: "The request took too long to complete. Please retry.",
            });
        }
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === "production" ? undefined : err.message,
    });
};
