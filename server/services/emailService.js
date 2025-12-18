const nodemailer = require('nodemailer');

// Email configuration
// For production, use environment variables for sensitive data
const EMAIL_CONFIG = {
  service: process.env.EMAIL_SERVICE || 'gmail', // gmail, outlook, yahoo, etc.
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your email address
    pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
  },
};

// Create reusable transporter
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.warn('⚠️  Email not configured. Set EMAIL_USER and EMAIL_PASSWORD in .env file');
      return null;
    }

    transporter = nodemailer.createTransport({
      service: EMAIL_CONFIG.service,
      auth: EMAIL_CONFIG.auth,
    });
  }
  return transporter;
};

// Send password reset email
const sendPasswordResetEmail = async (to, resetToken) => {
  const transport = getTransporter();
  
  if (!transport) {
    console.error('Email transporter not configured');
    return false;
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?token=${resetToken}`;
  
  const mailOptions = {
    from: `"ChatGPT Clone" <${EMAIL_CONFIG.auth.user}>`,
    to: to,
    subject: 'Password Reset Request - ChatGPT Clone',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background-color: #f9f9f9;
            border-radius: 10px;
            padding: 30px;
            border: 1px solid #e0e0e0;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #10a37f;
            margin-bottom: 10px;
          }
          .content {
            background-color: white;
            padding: 25px;
            border-radius: 8px;
            margin-bottom: 20px;
          }
          .button {
            display: inline-block;
            padding: 14px 30px;
            background-color: #10a37f;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 20px 0;
          }
          .button:hover {
            background-color: #0d8c6d;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 14px;
            margin-top: 20px;
          }
          .warning {
            background-color: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 6px;
            padding: 15px;
            margin-top: 20px;
            color: #856404;
          }
          .code-box {
            background-color: #f5f5f5;
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            word-break: break-all;
            margin: 15px 0;
            font-size: 13px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🤖 ChatGPT Clone</div>
            <h2 style="margin: 0; color: #333;">Password Reset Request</h2>
          </div>
          
          <div class="content">
            <p>Hello,</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <p style="margin-top: 20px;">Or copy and paste this link into your browser:</p>
            <div class="code-box">${resetUrl}</div>
            
            <div class="warning">
              <strong>⏰ Important:</strong> This link will expire in <strong>1 hour</strong> for security reasons.
            </div>
            
            <p style="margin-top: 20px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message, please do not reply to this email.</p>
            <p style="color: #999; font-size: 12px;">ChatGPT Clone &copy; 2025</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Password Reset Request

Hello,

We received a request to reset your password. Click the link below or copy it into your browser to create a new password:

${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

---
ChatGPT Clone
This is an automated message, please do not reply to this email.
    `,
  };

  try {
    const info = await transport.sendMail(mailOptions);
    console.log('✓ Password reset email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('✗ Failed to send password reset email:', error);
    return false;
  }
};

// Test email configuration
const testEmailConnection = async () => {
  const transport = getTransporter();
  
  if (!transport) {
    return false;
  }

  try {
    await transport.verify();
    console.log('✓ Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('✗ Email server connection failed:', error.message);
    return false;
  }
};

module.exports = {
  sendPasswordResetEmail,
  testEmailConnection,
};
