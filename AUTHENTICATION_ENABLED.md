# Authentication System - Complete Setup Guide

## ✅ What Has Been Implemented

### 1. **Authentication System Fully Enabled**
   - JWT-based authentication (Access + Refresh tokens)
   - Secure password hashing with bcrypt
   - User signup and login functionality
   - Protected API routes

### 2. **Frontend Changes**
   - ✅ Enabled `AuthProvider` wrapper in `main.tsx`
   - ✅ Uncommented authentication UI in `App.tsx`
   - ✅ Added login/signup pages with ChatGPT-like design
   - ✅ User menu with profile display and logout
   - ✅ Authentication gate (shows login before chat)
   - ✅ Loading state during authentication

### 3. **Backend Security**
   - ✅ All conversation endpoints require authentication
   - ✅ Users can only access their own conversations
   - ✅ Proper CORS configuration
   - ✅ Token expiration handling

### 4. **Database**
   - ✅ Users table with encrypted passwords
   - ✅ Refresh tokens table for session management
   - ✅ Conversations linked to user_id
   - ✅ Proper foreign key constraints

## 🚀 How to Use

### **Access the Application**
1. Open your browser to: **http://localhost:5173**
2. You'll see the **Login Page**

### **Create a New Account (Recommended)**
1. Click **"Don't have an account? Sign up"** at the bottom
2. Fill in:
   - Email: `your-email@example.com`
   - Username: `Your Name`
   - Password: `your-password` (minimum 6 characters)
   - Confirm Password: (same as above)
3. Click **"Create Account"**
4. You'll be automatically logged in and see the chat interface

### **Or Login to Existing Account**
If you already created an account:
1. Enter your email and password
2. Click **"Sign In"**

### **Features After Login**
- ✅ Create new conversations
- ✅ All conversations saved to database
- ✅ Chat history persists between sessions
- ✅ User menu in top right corner
- ✅ Logout functionality
- ✅ Each user sees only their own conversations

## 🎨 UI Features (ChatGPT-style)

### **Login Page**
- Clean, centered design
- Email and password fields
- Show/hide password toggle
- Error message display
- "Sign up" link at bottom
- Beautiful gradient accent colors

### **Signup Page**
- Username, email, password fields
- Password confirmation
- Client-side validation
- Show/hide password toggles
- "Already have an account?" link

### **Chat Interface (After Login)**
- User menu in header (top right)
  - Shows username and email
  - Logout button
- Theme toggle (Dark/Light)
- Full chat functionality with AI
- Persistent conversation history

## 🔐 Security Features

1. **Password Security**
   - Passwords hashed with bcrypt (salt rounds: 10)
   - Never stored in plain text
   - Minimum 6 characters required

2. **Token Management**
   - Access tokens expire in 15 minutes
   - Refresh tokens expire in 7 days
   - Tokens stored in localStorage
   - Automatic token refresh on expiration

3. **API Security**
   - All conversation endpoints protected
   - Users can only access their own data
   - Invalid tokens rejected with 401/403

4. **Database Security**
   - User_id foreign keys on all conversations
   - CASCADE delete (delete user → delete conversations)
   - Email uniqueness enforced

## 🛠️ Technical Details

### **Environment Variables**
**Backend** (`server/.env`):
```env
PORT=4000
FRONTEND_URL=http://localhost:5173

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=13579@pP
DB_NAME=chatbot

JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2025
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-2025
```

**Frontend** (`.env`):
```env
VITE_API_BASE_URL=http://localhost:4000/api
VITE_AZURE_OPENAI_ENDPOINT=https://open-ai-blusense.openai.azure.com
VITE_AZURE_OPENAI_API_KEY=290bb1ae36cd437195b15f1a2938b52b
VITE_AZURE_OPENAI_DEPLOYMENT_NAME=GPT-41
VITE_AZURE_OPENAI_API_VERSION=2025-01-01-preview
```

### **API Endpoints**

**Authentication:**
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout (revoke refresh token)
- `POST /api/auth/refresh` - Refresh access token
- `GET /api/auth/me` - Get current user profile

**Conversations (Protected):**
- `GET /api/conversations` - Get all user's conversations
- `POST /api/conversations` - Create new conversation
- `GET /api/conversations/:id` - Get single conversation
- `PATCH /api/conversations/:id/title` - Update title
- `DELETE /api/conversations/:id` - Delete conversation
- `POST /api/conversations/:id/messages` - Add message

### **Data Flow**

1. **User Signs Up:**
   ```
   Frontend → POST /api/auth/signup
   Backend → Hash password → Create user in DB
   Backend → Generate JWT tokens → Return to frontend
   Frontend → Store tokens in localStorage → Redirect to chat
   ```

2. **User Logs In:**
   ```
   Frontend → POST /api/auth/login
   Backend → Verify password → Generate tokens
   Frontend → Store tokens → Load conversations → Show chat
   ```

3. **Protected Request:**
   ```
   Frontend → Add "Authorization: Bearer <token>" header
   Backend → Verify token → Check user_id → Process request
   ```

4. **Token Expiration:**
   ```
   Access token expires → Frontend gets 401 error
   Frontend → Use refresh token → Get new access token
   Retry original request with new token
   ```

## 🐛 Troubleshooting

### **Can't See Conversations**
- Make sure you're logged in (check user menu in top right)
- Check browser console for errors
- Verify server is running on port 4000

### **Login Failed**
- Check email and password are correct
- Verify database connection
- Check server logs for errors

### **Database Errors**
- Ensure MySQL is running
- Verify database credentials in `server/.env`
- Run migration: `mysql -u root -p < database_auth_migration.sql`

### **CORS Errors**
- Verify `FRONTEND_URL` in `server/.env` is `http://localhost:5173`
- Restart server after changing .env

## 📝 Notes

- **First Time Setup**: Create a new account to get started
- **Multiple Users**: Each user has their own isolated conversations
- **Persistent Sessions**: Refresh tokens keep you logged in for 7 days
- **Logout Clears Everything**: Logout revokes tokens and clears local storage

## 🎉 Success!

Your chatbot now has a **fully functional authentication system** that:
- ✅ Matches ChatGPT's login/signup flow
- ✅ Securely stores passwords
- ✅ Isolates user data
- ✅ Maintains session state
- ✅ Provides smooth user experience

**Go ahead and create your account to start chatting!** 🚀
