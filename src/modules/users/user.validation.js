export const VALID_ROLES = [
	"ADMIN",
	"SALES_MANAGER",
	"PURCHASE_MANAGER",
	"INVENTORY_MANAGER",
	"PRODUCTION_MANAGER",
	"ACCOUNTANT",
];

export function isValidRole(role) {
	return VALID_ROLES.includes(role);
}

export function validatePasswordStrength(password) {
	if (typeof password !== "string" || password.length < 8) {
		return {
			valid: false,
			message: "password must be at least 8 characters",
		};
	}

	if (!/[A-Z]/.test(password)) {
		return {
			valid: false,
			message: "password must contain at least one uppercase letter",
		};
	}

	if (!/[a-z]/.test(password)) {
		return {
			valid: false,
			message: "password must contain at least one lowercase letter",
		};
	}

	if (!/\d/.test(password)) {
		return {
			valid: false,
			message: "password must contain at least one number",
		};
	}

	if (!/[^A-Za-z0-9]/.test(password)) {
		return {
			valid: false,
			message: "password must contain at least one special character",
		};
	}

	return { valid: true };
}

export const VALID_OVERRIDE_EFFECTS = ["GRANT", "DENY"];

export function isValidOverrideEffect(value) {
	return VALID_OVERRIDE_EFFECTS.includes(value);
}

export function parseOptionalFutureDate(value) {
	if (value === undefined || value === null || value === "") return null;

	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) {
		return { error: "expiresAt must be a valid date" };
	}

	if (parsed <= new Date()) {
		return { error: "expiresAt must be in the future" };
	}

	return { value: parsed };
}
