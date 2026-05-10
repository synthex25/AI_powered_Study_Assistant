/**
 * Password Validation Utility
 * Strong password requirements:
 * - Min 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 */
export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}
/**
 * Validate password strength
 * @param password - The password to validate
 * @returns Validation result with errors if any
 */
export declare function validatePassword(password: string): PasswordValidationResult;
//# sourceMappingURL=passwordValidation.d.ts.map