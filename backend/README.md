# TextileERP Backend - Authentication System

## 🎯 Overview

A production-ready, secure authentication and authorization system for TextileERP with the following features:

- ✅ **User Registration & Login** with email/password
- ✅ **Account Approval Workflow** - Management approval required before access
- ✅ **Role-Based Access Control (RBAC)** with 4 roles
- ✅ **JWT Token Management** - Access (15m) + Refresh (7d)
- ✅ **Secure Password** - Strong requirements + bcrypt hashing
- ✅ **Account Security** - Lockout after failed attempts
- ✅ **Email Notifications** - Beautiful HTML emails for all events
- ✅ **Audit Logging** - Complete activity tracking
- ✅ **Token Rotation** - Automatic refresh token rotation
- ✅ **Rate Limiting** - Protection against brute force attacks

---

## 📦 What's Been Created/Enhanced

### Core Files

| File | Description |
|------|-------------|
| [prisma/schema.prisma](#schema) | Enhanced database schema with audit logs |
| [src/controller/tokencontroller.js](#token-controller) | Comprehensive token management |
| [src/middleware/checktoken.js](#middleware) | Fixed token validation with correct JWT secrets |
| [src/middleware/rbac.js](#rbac) | Enhanced role-based access control |
| [src/routes/auth.js](#auth-routes) | Complete authentication endpoints |
| [src/services/mailer.js](#mailer) | Email service with beautiful templates |
| [src/app.js](#app) | Updated app configuration with security |
| [.env.example](#env) | Environment variables template |

### Documentation

| File | Purpose |
|------|---------|
| [AUTHENTICATION_GUIDE.md](#guides) | Complete authentication system guide |
| [RBAC_GUIDE.md](#guides) | Role-based access control documentation |
| [FRONTEND_INTEGRATION.md](#guides) | Frontend integration guide with React examples |
| [README.md](#readme) | This file |

---

## 🚀 Quick Start

### 1. Installation

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with:
- PostgreSQL connection string
- JWT secrets (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- Resend API key

### 3. Database Setup

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. Start Server

```bash
npm start
# or for development
npm run dev
```

Visit: http://localhost:3000/health

---

## 📊 Database Schema

### Core Tables

```
User (id, email, passwordHash, name, role, status, ...)
├── refreshTokens (RefreshToken[])
└── auditLogs (AuditLog[])

RefreshToken (id, token, userId, ipAddress, userAgent, expiresAt)

AuditLog (id, userId, actionType, actionDetails, performedBy, ipAddress, timestamp)
```

### Roles

```
MANAGEMENT    - Full admin control over users
PRODUCTION    - Production department access
MERCHANDISE   - Inventory/merchandise access
MARKETING     - Marketing department access
```

### Account Status

```
PENDING     - Waiting for management approval
APPROVED    - Can log in and access system
REJECTED    - Cannot access system
SUSPENDED   - Temporarily blocked from access
```

---

## 🔐 Security Features

### Password Security
- ✅ Minimum 8 characters
- ✅ Uppercase + Lowercase + Numbers + Special chars
- ✅ Bcrypt hashing with 12 salt rounds
- ✅ Password change tracking

### Account Protection
- ✅ Account lockout after 5 failed attempts (15 min)
- ✅ Last login IP tracking
- ✅ Session tracking via refresh tokens
- ✅ Failed login logging

### Token Security
- ✅ JWT signed tokens
- ✅ Token rotation on refresh
- ✅ HttpOnly cookies (XSS protection)
- ✅ Automatic token cleanup (expired tokens removed)

### API Protection
- ✅ Rate limiting (100 req/15 min)
- ✅ CORS configuration
- ✅ Helmet security headers
- ✅ Input validation

---

## 📋 API Endpoints

### Authentication (No Auth Required)

```
POST   /api/auth/register          Register new user
POST   /api/auth/login             Login with credentials
POST   /api/auth/refresh           Refresh access token
POST   /api/auth/logout            Logout user
```

### User (Auth + APPROVED Required)

```
GET    /api/auth/profile           Get user profile
POST   /api/auth/change-password   Change password
```

### Management (MANAGEMENT Role Required)

```
GET    /api/auth/admin/pending-users        List pending users
PATCH  /api/auth/admin/users/:id/approve    Approve user
PATCH  /api/auth/admin/users/:id/reject     Reject user
PATCH  /api/auth/admin/users/:id/role       Change user role
PATCH  /api/auth/admin/users/:id/suspend    Suspend user
```

See [API Endpoints](./AUTHENTICATION_GUIDE.md#api-endpoints) for detailed documentation.

---

## 🎯 User Workflow

```
User Registration
    ↓
Choose Role → Account Created (PENDING status)
    ↓
Management Reviews
    ├→ Approved → User can log in
    └→ Rejected → Cannot access
    ↓
Login with Credentials
    ↓
Get Access Token (15m) + Refresh Token (7d)
    ↓
Access Protected Resources
    ↓
Token Expires → Refresh Token
    ↓
New Access Token Generated
    ↓
Logout → Tokens Revoked
```

---

## 📧 Email Notifications

Automated emails sent for:

- 📧 **Welcome Email** - After registration
- 📧 **Approval Email** - When account approved
- 📧 **Rejection Email** - When application rejected
- 📧 **Role Change Email** - When role is changed
- 📧 **Suspension Email** - When account suspended

All emails are professionally designed with your branding.

---

## 🛠️ Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# JWT
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-secret-key

# Email
ResendAPIKey=your-resend-key
RESEND_FROM_EMAIL=noreply@company.com
FRONTEND_LOGIN_URL=https://yourfrontend.com/login

# App
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🧪 Testing

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@test.com",
    "password": "Test123!",
    "confirmPassword": "Test123!",
    "name": "Test User",
    "role": "PRODUCTION"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@test.com", "password": "Test123!"}'

# Get Profile
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer {ACCESS_TOKEN}"
```

### Using Postman

1. Import the API endpoints
2. Set environment variable: `base_url=http://localhost:3000`
3. Test each endpoint sequentially

---

## 📚 Documentation

### Comprehensive Guides

1. **[AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md)** 
   - Complete system overview
   - Database schema details
   - All API endpoints with examples
   - Error handling & troubleshooting

2. **[RBAC_GUIDE.md](./RBAC_GUIDE.md)**
   - Role definitions and permissions
   - RBAC implementation
   - Adding new roles
   - Best practices

3. **[FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)**
   - React integration examples
   - Auth context setup
   - Protected routes
   - Error handling

---

## 🔄 Token Flow

```
1. User Login
   ├─ Credentials verified
   ├─ Access Token generated (15m)
   ├─ Refresh Token generated (7d)
   ├─ Refresh Token stored in DB
   └─ Refresh Token set in httpOnly cookie

2. API Request
   ├─ Send Access Token in Authorization header
   └─ Server validates token

3. Token Expiration
   ├─ Catch 401 error
   ├─ Send Refresh Token from cookie
   ├─ Get new Access Token
   ├─ Retry original request
   └─ Continue session

4. Logout
   ├─ Revoke Refresh Token
   ├─ Clear cookie
   └─ Session ended
```

---

## 🐛 Troubleshooting

### "Database Connection Error"
- Check DATABASE_URL in .env
- Ensure PostgreSQL is running
- Verify credentials

### "JWT Secret not configured"
- Generate new secrets: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Add to .env file
- Restart server

### "Emails not sending"
- Verify Resend API key
- Check sender email is verified in Resend
- Test with: `curl -X POST https://api.resend.com/emails -H "Authorization: Bearer YOUR_KEY"`

### "User locked after failed attempts"
- Account auto-unlocks after 15 minutes
- Or: `UPDATE "User" SET lockedUntil = NULL WHERE id = 'user_id'`

See [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md#troubleshooting) for more help.

---

## 🔄 Deployment Checklist

- [ ] Update .env with production values
- [ ] Set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to strong random strings
- [ ] Configure FRONTEND_URL for production domain
- [ ] Setup Resend email with verified domain
- [ ] Set NODE_ENV=production
- [ ] Use HTTPS only
- [ ] Setup database backups
- [ ] Configure CORS for production domains
- [ ] Enable rate limiting
- [ ] Setup monitoring and logging
- [ ] Test all endpoints
- [ ] Verify email sending
- [ ] Setup SSL certificate
- [ ] Run migration on production DB: `npx prisma migrate deploy`

---

## 📊 Database Schema Visualization

```
┌─────────────────────────────────────────────┐
│           User Table                        │
├─────────────────────────────────────────────┤
│ id (UUID)                                   │
│ email (String, Unique)                      │
│ passwordHash (String)                       │
│ name (String)                               │
│ role (Enum: MANAGEMENT, PRODUCTION, ...)    │
│ status (Enum: PENDING, APPROVED, ...)       │
│ loginAttempts (Int)                         │
│ lastLoginAt (DateTime)                      │
│ lockedUntil (DateTime)                      │
│ createdAt (DateTime)                        │
│ updatedAt (DateTime)                        │
└────────────┬────────────────────────────────┘
             │
             ├──────────────────────────────────┐
             │                                  │
       ┌─────▼──────────────────────┐  ┌───────▼────────────────────┐
       │   RefreshToken Table       │  │    AuditLog Table          │
       ├────────────────────────────┤  ├────────────────────────────┤
       │ id (UUID)                  │  │ id (UUID)                  │
       │ token (String, Unique)     │  │ userId (UUID)              │
       │ userId (UUID) - FK         │  │ actionType (Enum)          │
       │ ipAddress (String)         │  │ actionDetails (String)     │
       │ userAgent (String)         │  │ performedBy (String)       │
       │ createdAt (DateTime)       │  │ ipAddress (String)         │
       │ expiresAt (DateTime)       │  │ timestamp (DateTime)       │
       └────────────────────────────┘  └────────────────────────────┘
```

---

## 🚀 Next Steps

1. **Frontend Integration**
   - Use [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)
   - Create login/register pages
   - Setup protected routes

2. **Business Logic Routes**
   - Create production routes in `src/routes/`
   - Apply middleware: `checktoken, checkApproved, requireRole(...)`
   - Implement business logic

3. **Additional Roles**
   - Update prisma schema
   - Add new role to validation
   - Create role-specific routes

4. **Enhanced Security**
   - Setup 2FA
   - Add email verification
   - Implement CAPTCHA for registration

---

## 📞 Support

For issues or questions:

1. Check [AUTHENTICATION_GUIDE.md](./AUTHENTICATION_GUIDE.md#troubleshooting)
2. Review error messages and stack traces
3. Verify environment variables
4. Check database connections
5. Test with curl/Postman

---

## 📝 Version History

**Version 1.0.0** (June 18, 2026)
- Initial release
- Complete auth system
- RBAC implementation
- Email notifications
- Audit logging
- Comprehensive documentation

---

## 📄 License

This project is part of TextileERP. All rights reserved.

---

## 🎉 Summary

You now have a **production-ready authentication system** with:

✅ Secure login/registration
✅ Account approval workflow  
✅ Role-based access control
✅ JWT token management
✅ Email notifications
✅ Audit logging
✅ Comprehensive documentation
✅ React integration examples
✅ Security best practices
✅ Error handling & troubleshooting

**Start building!** 🚀

---

**Last Updated:** June 18, 2026
**Version:** 1.0.0
