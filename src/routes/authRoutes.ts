import express from 'express';
import { 
  googleSignIn, 
  validateToken, 
  register, 
  login, 
  verifyOtp, 
  resendOtp,
  completeOnboarding,
  refreshToken,
  logout
} from '../controllers/authController';

const router = express.Router();

// Google Sign-In
router.post('/google', googleSignIn);

// Email/Password Authentication
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyOtp);
router.post('/resend-otp', resendOtp);

// Token Management
router.post('/validate-token', validateToken);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

// Onboarding
router.post('/complete-onboarding', completeOnboarding);

export default router;
