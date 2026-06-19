# TextileERP - RBAC & Role Management Guide

## Role-Based Access Control (RBAC)

TextileERP implements a comprehensive RBAC system with 4 distinct roles, each with specific permissions and responsibilities.

---

## Roles Overview

### 1. MANAGEMENT 👔

**Description:** Administrative role with full control over user management and system

**Permissions:**
- ✅ Approve/reject user registrations
- ✅ Suspend users
- ✅ Change user roles
- ✅ View pending user list
- ✅ Access all protected resources
- ✅ View audit logs

**Responsibilities:**
- Review and approve new user applications
- Ensure only authorized personnel get access
- Manage user roles and permissions
- Monitor and enforce security policies
- Investigate suspicious activities via audit logs

**Endpoints Accessible:**
```
GET  /api/auth/admin/pending-users
PATCH /api/auth/admin/users/:id/approve
PATCH /api/auth/admin/users/:id/reject
PATCH /api/auth/admin/users/:id/role
PATCH /api/auth/admin/users/:id/suspend
```

---

### 2. PRODUCTION 🏭

**Description:** Role for production department staff managing manufacturing processes

**Permissions:**
- ✅ Access production-related resources
- ✅ View own profile
- ✅ Change own password
- ✅ Access protected resources (after approval)
- ❌ Cannot manage other users
- ❌ Cannot approve/reject users
- ❌ Cannot suspend other users

**Responsibilities:**
- Manage production operations
- Report production issues
- Update production status
- Follow security protocols

**Endpoints Accessible:**
```
GET  /api/auth/profile
POST /api/auth/change-password
POST /api/auth/logout
(All production-related business routes)
```

---

### 3. MERCHANDISE 📦

**Description:** Role for merchandise department handling inventory and stock management

**Permissions:**
- ✅ Access merchandise-related resources
- ✅ View own profile
- ✅ Change own password
- ✅ Access protected resources (after approval)
- ❌ Cannot manage other users
- ❌ Cannot approve/reject users

**Responsibilities:**
- Manage inventory
- Track merchandise stock
- Process orders
- Update product information

**Endpoints Accessible:**
```
GET  /api/auth/profile
POST /api/auth/change-password
POST /api/auth/logout
(All merchandise-related business routes)
```

---

### 4. MARKETING 📢

**Description:** Role for marketing department managing campaigns and communications

**Permissions:**
- ✅ Access marketing-related resources
- ✅ View own profile
- ✅ Change own password
- ✅ Access protected resources (after approval)
- ❌ Cannot manage other users
- ❌ Cannot approve/reject users

**Responsibilities:**
- Manage marketing campaigns
- Create promotional content
- Analyze market trends
- Coordinate with other departments

**Endpoints Accessible:**
```
GET  /api/auth/profile
POST /api/auth/change-password
POST /api/auth/logout
(All marketing-related business routes)
```

---

## Account Status vs Role

### Important Distinction

**Status** (Approval Workflow):
- **PENDING:** Waiting for management approval
- **APPROVED:** User can access system
- **REJECTED:** Cannot access system
- **SUSPENDED:** Temporarily blocked from access

**Role** (Permissions):
- **MANAGEMENT:** Can manage users
- **PRODUCTION, MERCHANDISE, MARKETING:** Regular users

### Status Requirements

- **Only APPROVED users can log in**
- **Only APPROVED users can access protected resources**
- **Even MANAGEMENT users must be APPROVED to use admin functions**
- **SUSPENDED users cannot access anything**

---

## Implementing Role-Based Permissions

### In Routes

```javascript
import { requireRole, checkApproved } from '../middleware/rbac.js';

// Only MANAGEMENT can access
router.get('/admin/users', requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    // ...
});

// PRODUCTION and MERCHANDISE can access
router.get('/data', requireRole('PRODUCTION', 'MERCHANDISE'), checkApproved, async (req, res) => {
    // ...
});

// All roles can access (except SUSPENDED or PENDING)
router.get('/profile', checktoken, checkApproved, async (req, res) => {
    // ...
});
```

### Role Checking in Business Logic

```javascript
// Check user role in code
if (req.user.role === 'MANAGEMENT') {
    // Management-only logic
}

// Check multiple roles
if (['MANAGEMENT', 'PRODUCTION'].includes(req.user.role)) {
    // Logic for these roles
}

// Check status
if (req.user.status === 'APPROVED') {
    // Approved-only logic
}
```

---

## User Registration & Role Assignment

### Registration Process

```
User submits registration form
    ↓
System validates input
    ↓
User selects requested role:
├─ MANAGEMENT (must be manually changed later)
├─ PRODUCTION
├─ MERCHANDISE
└─ MARKETING
    ↓
Account created with PENDING status
    ↓
Status: PENDING
Role: (as selected)
    ↓
Management reviews application
    ├─ ✅ APPROVED → User can log in
    ├─ ❌ REJECTED → Account blocked
    └─ Can change role anytime after approval
```

### Initial Role Assignment

- Users cannot register as **MANAGEMENT**
  - Must register as another role first
  - Management must change their role (if needed)
  
- This prevents accidentally creating multiple management accounts

### Changing User Roles

**Management can change any user's role at any time:**

```bash
PATCH /api/auth/admin/users/{userId}/role
{
  "role": "MANAGEMENT"
}
```

The system will:
1. ✅ Validate the new role
2. ✅ Update user role in database
3. ✅ Send email notification to user
4. ✅ Log audit event with change details
5. ✅ Changes take effect immediately on next login

---

## Permissions Matrix

| Operation | MANAGEMENT | PRODUCTION | MERCHANDISE | MARKETING |
|-----------|:----------:|:----------:|:-----------:|:---------:|
| Login | ✅ | ✅ | ✅ | ✅ |
| View Profile | ✅ | ✅ | ✅ | ✅ |
| Change Password | ✅ | ✅ | ✅ | ✅ |
| View Pending Users | ✅ | ❌ | ❌ | ❌ |
| Approve User | ✅ | ❌ | ❌ | ❌ |
| Reject User | ✅ | ❌ | ❌ | ❌ |
| Change User Role | ✅ | ❌ | ❌ | ❌ |
| Suspend User | ✅ | ❌ | ❌ | ❌ |
| Access Production Routes | ✅* | ✅ | ❌ | ❌ |
| Access Merchandise Routes | ✅* | ❌ | ✅ | ❌ |
| Access Marketing Routes | ✅* | ❌ | ❌ | ✅ |

*Management can access all resources if explicitly granted in route configuration

---

## Adding New Roles

To add a new role (e.g., FINANCE):

### 1. Update Prisma Schema

```prisma
// prisma/schema.prisma
enum Role {
  MANAGEMENT
  PRODUCTION
  MERCHANDISE
  MARKETING
  FINANCE          // New role
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_finance_role
```

### 3. Update Validation in Auth Routes

```javascript
// src/routes/auth.js
const validRoles = ['MANAGEMENT', 'PRODUCTION', 'MERCHANDISE', 'MARKETING', 'FINANCE'];
```

### 4. Create Routes for New Role

```javascript
import { requireRole, checkApproved } from '../middleware/rbac.js';

router.get('/api/finance/reports', requireRole('FINANCE'), checkApproved, async (req, res) => {
    // Finance-specific logic
});
```

### 5. Document the New Role

Add documentation in this file for the new role.

---

## Best Practices for RBAC

### For Administrators

1. ✅ **Review requests carefully** before approving
2. ✅ **Use least privilege principle** - grant minimum necessary permissions
3. ✅ **Regular audits** - review user roles and permissions
4. ✅ **Suspend before deleting** - preserve audit trail
5. ✅ **Document changes** - add reason when changing roles
6. ✅ **Monitor access** - check audit logs for suspicious activity

### For Developers

1. ✅ **Always check both status and role**
   ```javascript
   // Wrong - only checks role
   if (req.user.role === 'MANAGEMENT') { }
   
   // Right - checks both
   if (req.user.role === 'MANAGEMENT' && req.user.status === 'APPROVED') { }
   ```

2. ✅ **Use middleware for protection**
   ```javascript
   router.patch('/admin/users/:id', 
       checktoken,        // Verify token
       checkApproved,     // Verify account approved
       requireRole('MANAGEMENT'),  // Verify role
       async (req, res) => { }
   );
   ```

3. ✅ **Never trust client-side role** - always verify on backend

4. ✅ **Log role-related actions** for audit trail

5. ✅ **Test with multiple roles** - ensure proper access control

### For Users

1. ✅ **Don't share credentials** - each person needs unique account
2. ✅ **Report role issues** - contact management if you lack access
3. ✅ **Use least privilege** - request minimum role needed
4. ✅ **Follow policies** - adhere to department-specific guidelines

---

## Troubleshooting RBAC Issues

### Problem: User can't access management features

**Possible Causes:**
1. Status is not APPROVED
   ```sql
   SELECT status FROM "User" WHERE id = 'user_id';
   ```

2. Role is not MANAGEMENT
   ```sql
   SELECT role FROM "User" WHERE id = 'user_id';
   ```

3. Token missing or expired - need to refresh

**Solution:**
- Check status and role above
- If status is PENDING/REJECTED/SUSPENDED, management approval needed
- If role is wrong, ask another MANAGEMENT to change it
- If token expired, call `/api/auth/refresh`

### Problem: User has correct role but can't access endpoint

**Possible Causes:**
1. Middleware not properly configured
2. Role check is case-sensitive
3. Status not checked in middleware

**Solution:**
```javascript
// Check these are applied in order:
app.use(checktoken);      // Verify token
app.use(checkApproved);   // Verify APPROVED status
app.use(requireRole('MANAGEMENT'));  // Check role
```

### Problem: Can't add new role

**Possible Causes:**
1. Prisma schema not updated
2. Migration not run
3. Validation list not updated

**Solution:**
```bash
# Update schema
# nano prisma/schema.prisma

# Run migration
npx prisma migrate dev --name add_role_name

# Restart server
npm start
```

---

## Advanced: Custom Permission Groups

For more complex permission systems, consider using permission-based approach:

```javascript
// Future enhancement - permission groups
const permissions = {
    'USER_MANAGEMENT': ['MANAGEMENT'],
    'VIEW_REPORTS': ['MANAGEMENT', 'FINANCE'],
    'PRODUCTION_CONTROL': ['MANAGEMENT', 'PRODUCTION'],
    'INVENTORY_MANAGEMENT': ['MANAGEMENT', 'MERCHANDISE'],
};

// Use in middleware
const requirePermission = (permission) => {
    return (req, res, next) => {
        if (permissions[permission]?.includes(req.user.role)) {
            next();
        } else {
            res.status(403).json({ success: false, message: 'Permission denied' });
        }
    };
};
```

---

**Last Updated:** June 18, 2026
**Version:** 1.0.0
