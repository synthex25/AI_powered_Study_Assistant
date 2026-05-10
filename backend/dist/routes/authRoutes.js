"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const jwtAuth_1 = __importDefault(require("../middleware/jwtAuth"));
const router = express_1.default.Router();
// Google Sign-In
router.post('/google', authController_1.googleSignIn);
// Email/Password Authentication
router.post('/register', authController_1.register);
router.post('/login', authController_1.login);
router.post('/verify-otp', authController_1.verifyOtp);
router.post('/resend-otp', authController_1.resendOtp);
// Token Management
router.post('/validate-token', authController_1.validateToken);
router.post('/refresh-token', authController_1.refreshToken);
router.post('/logout', authController_1.logout);
// Onboarding
router.post('/complete-onboarding', authController_1.completeOnboarding);
// Session debug (requires auth)
router.get('/me', jwtAuth_1.default, authController_1.me);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map