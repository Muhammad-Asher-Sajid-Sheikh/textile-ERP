# TextileERP Authentication System - Complete Guide

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Setup Instructions](#setup-instructions)
4. [Security Features](#security-features)
5. [API Endpoints](#api-endpoints)
6. [User Workflow](#user-workflow)
7. [Email Notifications](#email-notifications)
8. [Troubleshooting](#troubleshooting)

---

## System Overview

The TextileERP authentication system provides:

- ✅ **Secure Login/Registration** with email and password
- ✅ **Role-Based Access Control (RBAC)** with 4 roles:
  - `MANAGEMENT` - Can approve/reject/manage all users
  - `PRODUCTION` - Production department access
  - `MERCHANDISE` - Merchandise department access
  - `MARKETING` - Marketing department access
- ✅ **Account Approval Workflow** - Management approval required
- ✅ **JWT Token Management** - Access (15m) + Refresh (7d) tokens
- ✅ **Audit Logging** - All actions tracked with timestamps and IP addresses
- ✅ **Email Notifications** - Automated emails for all status changes
- ✅ **Security Features** - Password hashing, rate limiting, account lockout, refresh token rotation

---

## Database Schema

### User Table
```prisma
model User {
  id                String        @id @default(uuid())
  email             String        @unique
  passwordHash      String
  name              String
  role              Role          @default(PRODUCTION)
  status            AccountStatus @default(PENDING)
  department        String?
  isPasswordChanged Boolean       @default(false)
  loginAttempts     Int           @default(0)
  lastLoginAt       DateTime?
  lastLoginIp       String?
  lockedUntil       DateTime?
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  refreshTokens RefreshToken[]
  auditLogs     AuditLog[]
}
```

### RefreshToken Table
```prisma
model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  expiresAt DateTime
}
```

### AuditLog Table
```prisma
model AuditLog {
  id            String            @id @default(uuid())
  userId        String
  user          User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  actionType    AuditActionType
  actionDetails String?
  performedBy   String?
  ipAddress     String?
  timestamp     DateTime          @default(now())
}
```

### Enums
```prisma
enum Role {
  MANAGEMENT
  PRODUCTION
  MERCHANDISE
  MARKETING
}

enum AccountStatus {
  PENDING
  APPROVED
  REJECTED
  SUSPENDED
}

enum AuditActionType {
  REGISTERED
  APPROVED
  REJECTED
  SUSPENDED
  ROLE_CHANGED
  PASSWORD_CHANGED
  LOGIN_ATTEMPT
  LOGIN_FAILED
}
```

---

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values:
# - Database URL
# - JWT secrets (generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - Resend API key
# - Frontend URL
```

### 3. Generate JWT Secrets
```bash
# Run this command to generate strong secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Run twice - one for ACCESS, one for REFRESH
```

### 4. Setup Resend Email Service
1. Sign up at [Resend.com](https://resend.com)
2. Verify your domain or use their test domain
3. Copy your API key to `.env`
4. Set `RESEND_FROM_EMAIL` to your verified sender email

### 5. Run Prisma Migrations
```bash
# Create/update database schema
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### 6. Start the Server
```bash
npm start
# or for development with auto-reload
npm run dev
```

---

## Security Features

### 1. Password Security
- **Minimum 8 characters**
- **Must contain:**
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)
- **Hashed with bcrypt (12 salt rounds)**

### 2. Account Lockout
- After **5 failed login attempts**, account is locked
- Lock duration: **15 minutes**
- Failed attempts counter resets on successful login

### 3. Token Security
- **Access Token:** 15 minutes expiration
- **Refresh Token:** 7 days expiration
- Tokens stored in **httpOnly cookies** (prevents XSS)
- **Token rotation:** Old refresh token invalidated when new one issued
- **Database tracking:** All tokens tracked in DB for revocation

### 4. Rate Limiting
- **100 requests per 15 minutes** on auth endpoints
- Prevents brute force attacks

### 5. Audit Logging
- **All actions logged:** Login, approval, rejection, role changes, password changes
- **Timestamp and IP tracking** for security auditing
- Data preserved for compliance and investigation

---

## API Endpoints

### Authentication Endpoints (No Auth Required)

#### 1. Register
```
POST /api/auth/register
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "name": "John Doe",
  "role": "PRODUCTION"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Registration successful! Your account is pending management approval. Check your email for confirmation.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PRODUCTION",
    "status": "PENDING"
  }
}
```

#### 2. Login
```
POST /api/auth/login
```
**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Login successful!",
  "accesstoken": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "PRODUCTION"
  }
}
```
**Cookie Set:** `refreshtoken` (httpOnly, secure)

#### 3. Refresh Token
```
POST /api/auth/refresh
```
**Headers:**
```
Authorization: Bearer <access_token>
Cookie: refreshtoken=<refresh_token>
```
**Response:**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accesstoken": "eyJhbGc..."
}
```
**Cookie Set:** New `refreshtoken` (rotation)

#### 4. Logout
```
POST /api/auth/logout
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### User Endpoints (Auth + APPROVED Status Required)

#### 5. Get Profile
```
GET /api/auth/profile
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PRODUCTION",
    "status": "APPROVED",
    "department": null,
    "lastLoginAt": "2026-06-18T10:30:00Z",
    "createdAt": "2026-06-15T14:22:00Z"
  }
}
```

#### 6. Change Password
```
POST /api/auth/change-password
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Request:**
```json
{
  "currentPassword": "SecurePass123!",
  "newPassword": "NewSecure456!",
  "confirmPassword": "NewSecure456!"
}
```
**Response:**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

### Management Endpoints (MANAGEMENT Role + APPROVED Status Required)

#### 7. Get Pending Users
```
GET /api/auth/admin/pending-users
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "count": 3,
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "PRODUCTION",
      "status": "PENDING",
      "createdAt": "2026-06-15T14:22:00Z"
    }
  ]
}
```

#### 8. Approve User
```
PATCH /api/auth/admin/users/:id/approve
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Response:**
```json
{
  "success": true,
  "message": "User approved successfully! Notification email sent.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PRODUCTION",
    "status": "APPROVED"
  }
}
```

#### 9. Reject User
```
PATCH /api/auth/admin/users/:id/reject
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Request:**
```json
{
  "reason": "Credentials not verified"
}
```
**Response:**
```json
{
  "success": true,
  "message": "User rejected successfully! Notification email sent.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "REJECTED"
  }
}
```

#### 10. Change User Role
```
PATCH /api/auth/admin/users/:id/role
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Request:**
```json
{
  "role": "MANAGEMENT"
}
```
**Response:**
```json
{
  "success": true,
  "message": "User role changed successfully! Notification email sent.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "oldRole": "PRODUCTION",
    "newRole": "MANAGEMENT"
  }
}
```

#### 11. Suspend User
```
PATCH /api/auth/admin/users/:id/suspend
```
**Headers:**
```
Authorization: Bearer <access_token>
```
**Request:**
```json
{
  "reason": "Policy violation"
}
```
**Response:**
```json
{
  "success": true,
  "message": "User suspended successfully! Notification email sent.",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "status": "SUSPENDED"
  }
}
```

---

## User Workflow

### Complete User Journey

```
1. REGISTRATION
   ├─ User fills signup form
   ├─ Password validation (strength check)
   ├─ Email uniqueness check
   ├─ Account created with PENDING status
   ├─ Welcome email sent
   └─ User receives confirmation email

2. WAITING FOR APPROVAL
   ├─ Management reviews pending users
   └─ Account in PENDING state

3. MANAGEMENT APPROVAL/REJECTION
   ├─ Management approves → Status: APPROVED
   │  └─ Approval email sent to user
   │
   └─ Management rejects → Status: REJECTED
      └─ Rejection email sent to user
      └─ User cannot log in

4. LOGIN (After Approval)
   ├─ User enters email and password
   ├─ Credentials validated
   ├─ Account status checked (must be APPROVED)
   ├─ 15-minute access token generated
   ├─ 7-day refresh token generated
   ├─ Last login timestamp recorded
   └─ User logged in

5. ONGOING MANAGEMENT
   ├─ Management can change user role anytime
   │  └─ User receives role change email
   ├─ Management can suspend users
   │  └─ User receives suspension email
   │  └─ User cannot access system
   └─ Users can change their password
      └─ Audit log recorded

6. TOKEN REFRESH
   ├─ Access token expires after 15 minutes
   ├─ User uses refresh token to get new access token
   ├─ Old refresh token invalidated (rotation)
   ├─ New refresh token issued
   └─ User continues session

7. LOGOUT
   ├─ Refresh token revoked
   ├─ User session ended
   └─ Audit log recorded
```

---

## Email Notifications

### Emails Sent

1. **Welcome Email** (After Registration)
   - Confirms account registration
   - States pending approval status

2. **Approval Email** (When Approved)
   - Congratulations message
   - Assigned role
   - Login instructions

3. **Rejection Email** (When Rejected)
   - Rejection notification
   - Optional reason for rejection

4. **Role Change Email** (When Role Changed)
   - Previous role
   - New role
   - Effective immediately

5. **Suspension Email** (When Suspended)
   - Suspension notification
   - Optional reason

### Email Templates

All emails are professionally designed with:
- TextileERP branding
- Clear, readable content
- Action buttons (Login link in approval email)
- Support contact information
- Disclaimer that it's automated

---

## Troubleshooting

### Common Issues

#### 1. "Invalid JWT Secret" Error
**Problem:** JWT_ACCESS_SECRET or JWT_REFRESH_SECRET not set
**Solution:** 
```bash
# Generate secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Copy to .env file
```

#### 2. "Database Connection Error"
**Problem:** DATABASE_URL not configured correctly
**Solution:**
```bash
# Check .env file has valid PostgreSQL URL
# Format: postgresql://username:password@localhost:5432/textile_erp
# Test connection: npx prisma db push
```

#### 3. "Emails Not Sending"
**Problem:** RESEND configuration incorrect
**Solution:**
1. Verify API key is correct in .env (ResendAPIKey)
2. Verify sender email is verified in Resend dashboard
3. Check internet connection
4. Test with: curl -X POST https://api.resend.com/emails -H "Authorization: Bearer YOUR_KEY"

#### 4. "Account Locked"
**Problem:** User locked after 5 failed attempts
**Solution:**
- Wait 15 minutes, or
- Management can unlock by:
  1. Accessing database directly
  2. Update User set lockedUntil = NULL where id = 'user_id'

#### 5. "Token Expired"
**Problem:** Both access and refresh tokens expired
**Solution:**
- User must log in again
- Refresh token valid for 7 days
- If expired beyond that, full re-authentication required

#### 6. "User Can't Log In After Approval"
**Problem:** Status is APPROVED but login still fails
**Solution:**
1. Check account status: `SELECT status FROM "User" WHERE email = 'user@example.com'`
2. Check if account is locked: `SELECT lockedUntil FROM "User"`
3. Check token secrets are correct in .env

---

## Best Practices

### For Users
1. ✅ Use strong, unique passwords
2. ✅ Store refresh token securely
3. ✅ Log out when finished using the system
4. ✅ Report suspicious account activity

### For Administrators
1. ✅ Review pending users regularly
2. ✅ Verify user identities before approval
3. ✅ Keep audit logs for compliance
4. ✅ Rotate JWT secrets periodically
5. ✅ Monitor failed login attempts
6. ✅ Keep .env secrets secure (never commit to git)

### For Developers
1. ✅ Always validate input on backend
2. ✅ Never log sensitive data (passwords, tokens)
3. ✅ Use HTTPS in production
4. ✅ Keep dependencies updated
5. ✅ Monitor error logs
6. ✅ Set up automated backups

---

## Support & Additional Resources

- **Resend Email Documentation:** https://resend.com/docs
- **Prisma Documentation:** https://www.prisma.io/docs/
- **JWT Best Practices:** https://tools.ietf.org/html/rfc7519
- **OWASP Security Checklists:** https://owasp.org/

---

**Last Updated:** June 18, 2026
**Version:** 1.0.0
