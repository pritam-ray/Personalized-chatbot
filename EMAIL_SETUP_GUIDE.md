# Email Configuration Guide

This guide explains how to set up email functionality for the password reset feature in your ChatGPT Clone application.

## Overview

The password reset feature sends real emails to users with secure reset links. This guide covers:
- Gmail setup (recommended for development)
- Other email providers
- Testing the email functionality
- Troubleshooting

---

## Quick Setup with Gmail

### Step 1: Enable 2-Factor Authentication

1. Go to your Google Account: https://myaccount.google.com/
2. Navigate to **Security** → **2-Step Verification**
3. Follow the steps to enable 2FA if not already enabled

### Step 2: Generate App Password

1. Go to: https://myaccount.google.com/apppasswords
2. Select app: **Mail**
3. Select device: **Other (Custom name)** → Enter "ChatGPT Clone"
4. Click **Generate**
5. **Copy the 16-character password** (remove spaces)

### Step 3: Configure .env File

1. Open `server/.env` file
2. Add or update these lines:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-character-app-password

# Frontend URL (for reset links)
FRONTEND_URL=http://localhost:5173
```

### Step 4: Restart Server

```bash
cd server
npm run dev
```

You should see:
```
✓ MySQL database connected successfully
✓ Email server is ready to send messages
Server running on http://localhost:4000
```

---

## Alternative Email Providers

### Outlook/Hotmail

```env
EMAIL_SERVICE=outlook
EMAIL_USER=your-email@outlook.com
EMAIL_PASSWORD=your-password
```

### Yahoo Mail

```env
EMAIL_SERVICE=yahoo
EMAIL_USER=your-email@yahoo.com
EMAIL_PASSWORD=your-app-password
```

**Note:** Yahoo also requires app-specific passwords. Generate one at:
https://login.yahoo.com/account/security

### Custom SMTP Server

For other providers or custom SMTP:

```env
EMAIL_SERVICE=
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@example.com
EMAIL_PASSWORD=your-password
```

Common SMTP settings:
- **Gmail**: smtp.gmail.com:587
- **Outlook**: smtp-mail.outlook.com:587
- **Yahoo**: smtp.mail.yahoo.com:587
- **SendGrid**: smtp.sendgrid.net:587

---

## Testing Email Functionality

### 1. Test from the Application

1. Start the frontend and backend servers
2. Go to the login page
3. Click **"Forgot Password?"**
4. Enter your email address
5. Click **"Send Reset Link"**
6. Check your email inbox (and spam folder)

### 2. Check Server Logs

The server will log email activity:

**Success:**
```
✓ Password reset email sent to user@example.com
```

**Failure:**
```
✗ Failed to send password reset email: [error details]
```

### 3. Verify Email Content

The reset email includes:
- A prominent "Reset Your Password" button
- A direct reset link (also as text)
- Expiration notice (1 hour)
- Security information

---

## Troubleshooting

### Error: "Email server is ready to send messages" not shown

**Problem:** Email configuration not set up.

**Solution:**
1. Verify `EMAIL_USER` and `EMAIL_PASSWORD` are set in `.env`
2. Restart the server
3. Check for typos in the .env file

### Error: "Invalid login"

**Problem:** Using regular password instead of app password (Gmail).

**Solution:**
1. Generate a new app password: https://myaccount.google.com/apppasswords
2. Update `EMAIL_PASSWORD` in `.env`
3. Remove all spaces from the app password

### Error: "Connection timeout"

**Problem:** Firewall or network blocking SMTP port.

**Solution:**
1. Check if port 587 is open: `telnet smtp.gmail.com 587`
2. Try using port 465 with secure connection:
   ```env
   EMAIL_PORT=465
   EMAIL_SECURE=true
   ```
3. Check your antivirus/firewall settings

### Emails going to spam

**Problem:** Email not configured with proper SPF/DKIM records.

**Solution (for development):**
1. Check your spam folder
2. Mark the email as "Not Spam"
3. For production, consider using:
   - SendGrid (free tier available)
   - AWS SES
   - Mailgun
   - Postmark

### Error: "Greeting never received"

**Problem:** Wrong SMTP server or port.

**Solution:**
1. Verify SMTP settings for your provider
2. Try alternative ports (587, 465, 25)
3. Check if your ISP blocks outgoing SMTP

---

## Production Recommendations

### Use a Dedicated Email Service

For production, use a professional email service:

#### SendGrid (Recommended)

**Free tier:** 100 emails/day

1. Sign up at: https://sendgrid.com
2. Create API key
3. Configure:

```env
EMAIL_SERVICE=
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
```

#### AWS SES

**Pricing:** $0.10 per 1,000 emails

1. Set up AWS SES
2. Verify domain
3. Configure SMTP credentials

#### Mailgun

**Free tier:** 5,000 emails/month for 3 months

1. Sign up at: https://mailgun.com
2. Get SMTP credentials
3. Configure similar to SendGrid

### Security Best Practices

1. **Never commit .env file to Git**
   - It's already in `.gitignore`
   - Verify: `git status` should not show `.env`

2. **Use environment variables in production**
   - Set them in your hosting platform (Heroku, AWS, etc.)
   - Don't use .env files on production servers

3. **Rotate credentials regularly**
   - Change email passwords every 90 days
   - Revoke unused app passwords

4. **Monitor email sending**
   - Track bounce rates
   - Monitor spam complaints
   - Set up alerts for failures

### Email Template Customization

To customize the email template, edit:
```
server/services/emailService.js
```

Look for the `sendPasswordResetEmail` function and modify the HTML template.

---

## Verification Checklist

- [ ] 2FA enabled on Gmail account
- [ ] App password generated
- [ ] `.env` file configured with EMAIL_USER and EMAIL_PASSWORD
- [ ] Server restarted after configuration
- [ ] "Email server is ready" message appears in logs
- [ ] Test email sent successfully
- [ ] Email received in inbox (check spam folder)
- [ ] Reset link works correctly
- [ ] Password successfully reset

---

## Environment Variables Reference

```env
# Required for email functionality
EMAIL_SERVICE=gmail                    # Email service provider
EMAIL_USER=your-email@gmail.com       # Your email address
EMAIL_PASSWORD=your-app-password       # App-specific password

# Optional (advanced)
EMAIL_HOST=smtp.gmail.com             # SMTP server (if not using service)
EMAIL_PORT=587                        # SMTP port
EMAIL_SECURE=false                    # Use TLS (true for port 465)

# Application settings
FRONTEND_URL=http://localhost:5173    # Frontend URL for reset links
```

---

## Support

If you encounter issues not covered here:

1. Check server logs for detailed error messages
2. Verify your email provider's SMTP settings
3. Test with a simple email script first
4. Check if your hosting provider blocks outbound SMTP

---

## Development vs Production

### Development (Local)
- Use Gmail with app password
- FRONTEND_URL=http://localhost:5173
- Emails may go to spam (normal)

### Production (Deployed)
- Use professional email service (SendGrid, AWS SES)
- FRONTEND_URL=https://yourdomain.com
- Verify domain for better deliverability
- Set up SPF, DKIM, and DMARC records

---

**Last Updated:** January 2025
