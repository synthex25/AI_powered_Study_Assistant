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
  strength: 'weak' | 'medium' | 'strong';
}

export interface PasswordRequirement {
  label: string;
  met: boolean;
}

const MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;
const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;

/**
 * Validate password strength
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  
  if (password.length < MIN_LENGTH) {
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
  
  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  const passedChecks = 5 - errors.length;
  
  if (passedChecks >= 5 && password.length >= 12) {
    strength = 'strong';
  } else if (passedChecks >= 4) {
    strength = 'medium';
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Get detailed password requirements with status
 */
export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      label: `At least ${MIN_LENGTH} characters`,
      met: password.length >= MIN_LENGTH,
    },
    {
      label: 'One uppercase letter (A-Z)',
      met: UPPERCASE_REGEX.test(password),
    },
    {
      label: 'One lowercase letter (a-z)',
      met: LOWERCASE_REGEX.test(password),
    },
    {
      label: 'One number (0-9)',
      met: NUMBER_REGEX.test(password),
    },
    {
      label: 'One special character (!@#$%...)',
      met: SPECIAL_CHAR_REGEX.test(password),
    },
  ];
}
