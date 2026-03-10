export class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.success = true;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }
}

export class ApiError extends Error {
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        this.success = false;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
