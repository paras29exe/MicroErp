import { ApiError } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            success: false,
            statusCode: err.statusCode,
            message: err.message,
        });
    }

    console.error(err);
    return res.status(500).json({
        success: false,
        statusCode: 500,
        message: "Internal server error",
    });
};
