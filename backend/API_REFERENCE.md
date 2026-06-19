# TextileERP - Complete API Reference

## Base URL
```
http://localhost:3000
```

## Authentication
Most endpoints require an **Access Token** in the Authorization header:
```
Authorization: Bearer {accessToken}
```

The **Refresh Token** is stored in an **httpOnly cookie** and sent automatically with each request.

---

## Table of Contents
1. [Health Check](#1-health-check)
2. [Authentication Endpoints](#authentication-endpoints)
   - [Register](#2-register)
   - [Login](#3-login)
   - [Refresh Token](#4-refresh-token)
   - [Logout](#5-logout)
3. [User Profile](#6-get-user-profile)
4. [Account Management](#7-change-password)
5. [Admin Endpoints](#admin-endpoints)
   - [Get Pending Users](#8-get-pending-users)
   - [Approve User](#9-approve-user)
   - [Reject User](#10-reject-user)
   - [Change User Role](#11-change-user-role)
   - [Suspend User](#12-suspend-user)

---

# Public Endpoints (No Authentication Required)

## 1. Health Check

**Endpoint:** `GET /health`

**Description:** Check if the server is running and healthy.

**Headers:**
```
Content-Type: application/json
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2026-06-18T10:30:00.000Z"
}
```

**Status Codes:**
- `200 OK` - Server is healthy

---

# Authentication Endpoints

## 2. Register

**Endpoint:** `POST /api/auth/register`

**Description:** Register a new user account. The account will be created with `PENDING` status and requires management approval.

**Rate Limit:** 100 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "confirmPassword": "SecurePass123!",
  "name": "John Doe",
  "role": "PRODUCTION"
}
```

**Field Validation:**
- `email` (string, required): Valid email address
- `password` (string, required): Must contain:
  - Minimum 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (!@#$%^&*(),.?":{}|<>)
- `confirmPassword` (string, required): Must match password
- `name` (string, required): User's full name
- `role` (string, required): One of: `MANAGEMENT`, `PRODUCTION`, `MERCHANDISE`, `MARKETING`

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Registration successful! Your account is pending management approval. Check your email for confirmation.",
  "user": {
    "id": "user_id_uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PRODUCTION",
    "status": "PENDING"
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "message": "All fields are required."
}
```

**400 Bad Request - Password Mismatch:**
```json
{
  "success": false,
  "message": "Passwords do not match."
}
```

**400 Bad Request - Weak Password:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters."
}
```

**400 Bad Request - Invalid Role:**
```json
{
  "success": false,
  "message": "Invalid role specified."
}
```

**409 Conflict - Email Already Exists:**
```json
{
  "success": false,
  "message": "Email is already registered."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error during registration."
}
```

**Status Codes:**
- `201 Created` - User registered successfully
- `400 Bad Request` - Validation error
- `409 Conflict` - Email already registered
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Side Effects:**
- User account created with PENDING status
- Welcome email sent to user
- Audit log entry created

---

## 3. Login

**Endpoint:** `POST /api/auth/login`

**Description:** Login with email and password. Returns access token and sets refresh token cookie.

**Rate Limit:** 100 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Field Validation:**
- `email` (string, required): User email
- `password` (string, required): User password

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful!",
  "accesstoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id_uuid",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "PRODUCTION"
  }
}
```

**Cookies Set:**
```
Set-Cookie: refreshtoken={refreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800000
```

**Error Responses:**

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "message": "Email and password are required."
}
```

**401 Unauthorized - Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid credentials."
}
```

**403 Forbidden - Account Locked:**
```json
{
  "success": false,
  "message": "Account is temporarily locked due to multiple failed login attempts. Try again later."
}
```

**403 Forbidden - Account Not Approved:**
```json
{
  "success": false,
  "status": "PENDING",
  "message": "Your account is pending. Please contact management."
}
```

**403 Forbidden - Account Suspended:**
```json
{
  "success": false,
  "message": "Your account has been suspended. Please contact administration."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error during login."
}
```

**Status Codes:**
- `200 OK` - Login successful
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account not approved, suspended, or locked
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Security Features:**
- Account locks after 5 failed login attempts (15 minutes)
- Failed login attempts tracked
- Last login time and IP recorded
- Audit log entry created

---

## 4. Refresh Token

**Endpoint:** `POST /api/auth/refresh`

**Description:** Get a new access token using the refresh token. Old refresh token is revoked.

**Rate Limit:** 100 requests per 15 minutes

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
Cookie: refreshtoken={refreshToken}
```

**Request Body:** None (uses cookies and headers)

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "accesstoken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Cookies Set:**
```
Set-Cookie: refreshtoken={newRefreshToken}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800000
```

**Error Responses:**

**401 Unauthorized - No Refresh Token:**
```json
{
  "success": false,
  "message": "Refresh token not found. Please log in again."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid refresh token. Please log in again."
}
```

**401 Unauthorized - Token Expired:**
```json
{
  "success": false,
  "message": "Refresh token has expired. Please log in again."
}
```

**Status Codes:**
- `200 OK` - Token refreshed successfully
- `401 Unauthorized` - Invalid or expired token
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

**Security Features:**
- Old refresh token is revoked on success
- Token rotation implemented
- Audit log entry created

---

## 5. Logout

**Endpoint:** `POST /api/auth/logout`

**Description:** Logout the user and revoke refresh token.

**Authentication Required:** Yes (Bearer token)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
Cookie: refreshtoken={refreshToken}
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Cookies Cleared:**
```
Set-Cookie: refreshtoken=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0
```

**Error Responses:**

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid token."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Error during logout"
}
```

**Status Codes:**
- `200 OK` - Logout successful
- `401 Unauthorized` - Missing or invalid token
- `500 Internal Server Error` - Server error

**Side Effects:**
- Refresh token revoked
- Cookie cleared
- Audit log entry created

---

# User Endpoints

## 6. Get User Profile

**Endpoint:** `GET /api/auth/profile`

**Description:** Get the current authenticated user's profile information.

**Authentication Required:** Yes (Bearer token)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "id": "user_id_uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "PRODUCTION",
    "status": "APPROVED",
    "department": "Manufacturing",
    "lastLoginAt": "2026-06-18T09:30:00.000Z",
    "createdAt": "2026-06-17T14:20:00.000Z"
  }
}
```

**Error Responses:**

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**401 Unauthorized - Invalid Token:**
```json
{
  "success": false,
  "message": "Invalid token."
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch profile."
}
```

**Status Codes:**
- `200 OK` - Profile retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

---

## 7. Change Password

**Endpoint:** `POST /api/auth/change-password`

**Description:** Change the current user's password. Requires the current password for verification.

**Authentication Required:** Yes (Bearer token)

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body:**
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass456!",
  "confirmPassword": "NewPass456!"
}
```

**Field Validation:**
- `currentPassword` (string, required): Current password for verification
- `newPassword` (string, required): New password (must be strong - see password requirements)
- `confirmPassword` (string, required): Confirmation of new password

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

**Error Responses:**

**400 Bad Request - Missing Fields:**
```json
{
  "success": false,
  "message": "All fields are required."
}
```

**400 Bad Request - Passwords Don't Match:**
```json
{
  "success": false,
  "message": "New passwords do not match."
}
```

**400 Bad Request - Same as Current:**
```json
{
  "success": false,
  "message": "New password must be different from current password."
}
```

**400 Bad Request - Weak Password:**
```json
{
  "success": false,
  "message": "Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters."
}
```

**401 Unauthorized - Invalid Current Password:**
```json
{
  "success": false,
  "message": "Current password is incorrect."
}
```

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to change password."
}
```

**Status Codes:**
- `200 OK` - Password changed successfully
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Invalid current password or missing token
- `500 Internal Server Error` - Server error

**Side Effects:**
- User password updated
- Audit log entry created

---

# Admin Endpoints (MANAGEMENT Role Only)

All admin endpoints require:
1. Valid access token (Bearer token)
2. User must have `MANAGEMENT` role
3. User account must be `APPROVED`

---

## 8. Get Pending Users

**Endpoint:** `GET /api/auth/admin/pending-users`

**Description:** Retrieve all users with PENDING status awaiting approval.

**Authentication Required:** Yes (Bearer token + MANAGEMENT role)

**Authorization:** MANAGEMENT role required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "count": 3,
  "users": [
    {
      "id": "user_id_1",
      "email": "production@example.com",
      "name": "Alice Smith",
      "role": "PRODUCTION",
      "status": "PENDING",
      "createdAt": "2026-06-18T08:00:00.000Z"
    },
    {
      "id": "user_id_2",
      "email": "marketing@example.com",
      "name": "Bob Johnson",
      "role": "MARKETING",
      "status": "PENDING",
      "createdAt": "2026-06-18T09:15:00.000Z"
    }
  ]
}
```

**Error Responses:**

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**403 Forbidden - Insufficient Permission:**
```json
{
  "success": false,
  "message": "Insufficient permissions. MANAGEMENT role required."
}
```

**403 Forbidden - Account Not Approved:**
```json
{
  "success": false,
  "message": "Your account is not approved yet."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to fetch pending users."
}
```

**Status Codes:**
- `200 OK` - Pending users retrieved successfully
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `500 Internal Server Error` - Server error

---

## 9. Approve User

**Endpoint:** `PATCH /api/auth/admin/users/:id/approve`

**Description:** Approve a pending user account. User will receive approval email.

**Authentication Required:** Yes (Bearer token + MANAGEMENT role)

**Authorization:** MANAGEMENT role required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**URL Parameters:**
```
:id = User ID (UUID string)
```

**Request Body:** None

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User approved successfully! Notification email sent.",
  "user": {
    "id": "user_id_uuid",
    "email": "production@example.com",
    "name": "Alice Smith",
    "role": "PRODUCTION",
    "status": "APPROVED"
  }
}
```

**Error Responses:**

**400 Bad Request - Already Approved:**
```json
{
  "success": false,
  "message": "User is already approved."
}
```

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**403 Forbidden - Insufficient Permission:**
```json
{
  "success": false,
  "message": "Insufficient permissions. MANAGEMENT role required."
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to approve user."
}
```

**Status Codes:**
- `200 OK` - User approved successfully
- `400 Bad Request` - User already approved
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Side Effects:**
- User status changed to APPROVED
- Approval email sent to user
- Audit log entry created

---

## 10. Reject User

**Endpoint:** `PATCH /api/auth/admin/users/:id/reject`

**Description:** Reject a pending user account. User will receive rejection email.

**Authentication Required:** Yes (Bearer token + MANAGEMENT role)

**Authorization:** MANAGEMENT role required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**URL Parameters:**
```
:id = User ID (UUID string)
```

**Request Body:**
```json
{
  "reason": "Does not meet department requirements"
}
```

**Field Validation:**
- `reason` (string, optional): Reason for rejection. If not provided, defaults to "No reason provided"

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User rejected successfully! Notification email sent.",
  "user": {
    "id": "user_id_uuid",
    "email": "production@example.com",
    "name": "Alice Smith",
    "status": "REJECTED"
  }
}
```

**Error Responses:**

**400 Bad Request - Not Pending:**
```json
{
  "success": false,
  "message": "Can only reject pending users."
}
```

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**403 Forbidden - Insufficient Permission:**
```json
{
  "success": false,
  "message": "Insufficient permissions. MANAGEMENT role required."
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to reject user."
}
```

**Status Codes:**
- `200 OK` - User rejected successfully
- `400 Bad Request` - User is not pending
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Side Effects:**
- User status changed to REJECTED
- Rejection email sent to user with reason
- Audit log entry created

---

## 11. Change User Role

**Endpoint:** `PATCH /api/auth/admin/users/:id/role`

**Description:** Change a user's role. User will receive role change email.

**Authentication Required:** Yes (Bearer token + MANAGEMENT role)

**Authorization:** MANAGEMENT role required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**URL Parameters:**
```
:id = User ID (UUID string)
```

**Request Body:**
```json
{
  "role": "MERCHANDISE"
}
```

**Field Validation:**
- `role` (string, required): One of: `MANAGEMENT`, `PRODUCTION`, `MERCHANDISE`, `MARKETING`

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User role changed successfully! Notification email sent.",
  "user": {
    "id": "user_id_uuid",
    "email": "user@example.com",
    "name": "Alice Smith",
    "oldRole": "PRODUCTION",
    "newRole": "MERCHANDISE"
  }
}
```

**Error Responses:**

**400 Bad Request - Missing Role:**
```json
{
  "success": false,
  "message": "New role is required."
}
```

**400 Bad Request - Invalid Role:**
```json
{
  "success": false,
  "message": "Invalid role specified."
}
```

**400 Bad Request - Same Role:**
```json
{
  "success": false,
  "message": "User already has this role."
}
```

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**403 Forbidden - Insufficient Permission:**
```json
{
  "success": false,
  "message": "Insufficient permissions. MANAGEMENT role required."
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to change user role."
}
```

**Status Codes:**
- `200 OK` - Role changed successfully
- `400 Bad Request` - Invalid role or validation error
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Side Effects:**
- User role updated
- Role change email sent to user with old and new role
- Audit log entry created

---

## 12. Suspend User

**Endpoint:** `PATCH /api/auth/admin/users/:id/suspend`

**Description:** Suspend a user account (prevents login). User will receive suspension email.

**Authentication Required:** Yes (Bearer token + MANAGEMENT role)

**Authorization:** MANAGEMENT role required

**Headers:**
```
Content-Type: application/json
Authorization: Bearer {accessToken}
```

**URL Parameters:**
```
:id = User ID (UUID string)
```

**Request Body:**
```json
{
  "reason": "Violation of company policy"
}
```

**Field Validation:**
- `reason` (string, optional): Reason for suspension. If not provided, defaults to "No reason provided"

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User suspended successfully! Notification email sent.",
  "user": {
    "id": "user_id_uuid",
    "email": "user@example.com",
    "name": "Alice Smith",
    "status": "SUSPENDED"
  }
}
```

**Error Responses:**

**400 Bad Request - Already Suspended:**
```json
{
  "success": false,
  "message": "User is already suspended."
}
```

**401 Unauthorized - No Access Token:**
```json
{
  "success": false,
  "message": "No access token found. Please log in."
}
```

**403 Forbidden - Insufficient Permission:**
```json
{
  "success": false,
  "message": "Insufficient permissions. MANAGEMENT role required."
}
```

**404 Not Found - User Not Found:**
```json
{
  "success": false,
  "message": "User not found."
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Failed to suspend user."
}
```

**Status Codes:**
- `200 OK` - User suspended successfully
- `400 Bad Request` - User already suspended
- `401 Unauthorized` - Missing or invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - User not found
- `500 Internal Server Error` - Server error

**Side Effects:**
- User status changed to SUSPENDED
- Suspension email sent to user with reason
- User cannot login while suspended
- Audit log entry created

---

## API Status Codes Summary

| Code | Meaning | Common Causes |
|------|---------|---------------|
| `200` | OK | Request successful |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Invalid input, missing fields, validation error |
| `401` | Unauthorized | Missing/invalid token, expired token |
| `403` | Forbidden | Insufficient permissions, account not approved |
| `404` | Not Found | Resource doesn't exist |
| `409` | Conflict | Email already exists |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error, check logs |

---

## Authentication Flow Diagram

```
1. User Registration (POST /api/auth/register)
   ↓
2. Management Approval (PATCH /api/auth/admin/users/:id/approve)
   ↓
3. User Login (POST /api/auth/login)
   ├─ Returns: accessToken (in body)
   └─ Sets: refreshtoken (in httpOnly cookie)
   ↓
4. Use accessToken for Protected Endpoints
   ├─ Header: Authorization: Bearer {accessToken}
   └─ Cookie: refreshtoken (auto-sent)
   ↓
5. Token Expiry Handling
   ├─ Access Token expires in 15 minutes
   └─ POST /api/auth/refresh with new token
   ↓
6. Logout (POST /api/auth/logout)
   └─ Revokes refresh token
```

---

## Common Use Cases

### Complete Registration & Login Flow
```
POST /api/auth/register
  ↓
Wait for email approval
  ↓
POST /api/auth/login
  ↓
Store accessToken
  ↓
Use in Authorization header for protected endpoints
```

### Refresh Expired Access Token
```
Access token expired (401 error)
  ↓
POST /api/auth/refresh
  ↓
Get new accessToken
  ↓
Retry original request with new token
```

### Admin Approval Workflow
```
GET /api/auth/admin/pending-users
  ↓
Review pending applications
  ↓
PATCH /api/auth/admin/users/:id/approve
  OR
PATCH /api/auth/admin/users/:id/reject
```

---

## Security Notes

1. **Always use HTTPS in production** - Never send tokens over HTTP
2. **Access tokens are short-lived (15 minutes)** - Always refresh when expired
3. **Refresh tokens are httpOnly cookies** - Cannot be accessed via JavaScript
4. **Passwords are hashed with bcrypt** - Stored securely in database
5. **Rate limiting is enforced** - 100 requests per 15 minutes
6. **All actions are logged** - Check audit logs for compliance
7. **IP addresses are tracked** - For security audit trails

---

## Testing with cURL

### Register a User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "confirmPassword": "SecurePass123!",
    "name": "John Doe",
    "role": "PRODUCTION"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!"
  }'
```

### Get Profile (with token)
```bash
curl -X GET http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json"
```

### Refresh Token
```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Authorization: Bearer {accessToken}" \
  -H "Content-Type: application/json" \
  -b "refreshtoken={refreshToken}"
```

### Get Pending Users (Admin)
```bash
curl -X GET http://localhost:3000/api/auth/admin/pending-users \
  -H "Authorization: Bearer {managementAccessToken}" \
  -H "Content-Type: application/json"
```

### Approve User (Admin)
```bash
curl -X PATCH http://localhost:3000/api/auth/admin/users/{userId}/approve \
  -H "Authorization: Bearer {managementAccessToken}" \
  -H "Content-Type: application/json"
```

---

## Environment Variables Required

```
JWT_ACCESS_SECRET=your_secret_here
JWT_REFRESH_SECRET=your_secret_here
DATABASE_URL=postgresql://user:password@localhost:5432/textileerp
ResendAPIKey=your_resend_api_key
RESEND_FROM_EMAIL=noreply@example.com
FRONTEND_LOGIN_URL=http://localhost:3000/login
```

---

**Last Updated:** 2026-06-18
**API Version:** 1.0
**Status:** Production Ready
