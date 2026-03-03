import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../utils/logger';

// Create transporter
const transporter = nodemailer.createTransport({
  host: "smtp.zoho.in",
  port: 465,
  secure: true,
  auth: {
    user: config.emailUser,
    pass: config.emailPassword,
  },
});

/**
 * Generate 6-digit OTP
 */
export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP verification email
 */
export const sendOtpEmail = async (
  email: string,
  otp: string,
  name: string
): Promise<void> => {
  console.log("Email service called", config.emailUser);
  
  const mailOptions = {
    from: {
      name: 'Notewise',
      address: config.emailUser
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
    logger.info(`OTP email sent to ${email}`);
  } catch (error) {
    logger.error('Failed to send OTP email:', error);
    throw new Error('Failed to send verification email');
  };
};

