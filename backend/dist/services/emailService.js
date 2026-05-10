"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendOtpEmail = exports.generateOtp = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../utils/logger"));
// Create transporter
const transporter = nodemailer_1.default.createTransport({
    host: "smtp.zoho.in",
    port: 465,
    secure: true,
    auth: {
        user: config_1.default.emailUser,
        pass: config_1.default.emailPassword,
    },
});
/**
 * Generate 6-digit OTP
 */
const generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};
exports.generateOtp = generateOtp;
/**
 * Send OTP verification email
 */
const sendOtpEmail = async (email, otp, name) => {
    console.log("Email service called", config_1.default.emailUser);
    const mailOptions = {
        from: {
            name: 'Notewise',
            address: config_1.default.emailUser
        },
        to: email,
        subject: 'Your Notewise Verification Code',
        // Plain text version (helps avoid spam)
        text: `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't create an account, you can safely ignore this email.\n\n- The Notewise Team`,
        // HTML version
        html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; padding: 40px; margin: 0; }
          .container { max-width: 500px; margin: 0 auto; background: linear-gradient(to bottom, #1e293b, #0f172a); border-radius: 16px; padding: 40px; border: 1px solid #334155; }
          .logo { text-align: center; margin-bottom: 30px; }
          .logo h1 { color: #a78bfa; font-size: 28px; margin: 0; }
          .content { text-align: center; color: #e2e8f0; }
          .otp-box { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px 40px; border-radius: 12px; margin: 30px 0; display: inline-block; }
          .otp { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: white; margin: 0; }
          .message { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #334155; color: #64748b; font-size: 12px; text-align: center; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">
            <h1>🧠 Notewise</h1>
          </div>
          <div class="content">
            <h2 style="color: #f8fafc; margin-bottom: 10px;">Hello ${name}!</h2>
            <p class="message">Welcome to Notewise! Use the verification code below to complete your registration.</p>
            <div class="otp-box">
              <p class="otp">${otp}</p>
            </div>
            <p class="message">This code expires in <strong style="color: #a78bfa;">10 minutes</strong>.</p>
            <p class="message">If you didn't create an account, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Notewise. Transform any content into knowledge.</p>
          </div>
        </div>
      </body>
      </html>
    `,
        // Headers to improve deliverability
        headers: {
            'X-Priority': '1',
            'X-Mailer': 'Notewise Mailer',
        },
    };
    try {
        await transporter.sendMail(mailOptions);
        logger_1.default.info(`OTP email sent to ${email}`);
    }
    catch (error) {
        logger_1.default.error('Failed to send OTP email:', error);
        throw new Error('Failed to send verification email');
    }
    ;
};
exports.sendOtpEmail = sendOtpEmail;
//# sourceMappingURL=emailService.js.map