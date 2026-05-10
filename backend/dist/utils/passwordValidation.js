"use strict";
/**
 * Password Validation Utility
 * Strong password requirements:
 * - Min 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePassword = validatePassword;
const MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result with errors if any
 */
function validatePassword(password) {
    const errors = [];
    if (!password || password.length < MIN_LENGTH) {
        errors.push(`Password must be at least ${MIN_LENGTH} characters`);
    }
    if (!UPPERCASE_REGEX.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!LOWERCASE_REGEX.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!NUMBER_REGEX.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (!SPECIAL_CHAR_REGEX.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*...)');
    }
    return {
        isValid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=passwordValidation.js.map