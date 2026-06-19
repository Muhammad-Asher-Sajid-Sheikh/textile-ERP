import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';
import { authLimiter } from '../middleware/ratelimiter.js';
import { checktoken } from '../middleware/checktoken.js';
import { requireRole, checkApproved } from '../middleware/rbac.js';
import {
    sendWelcomeEmail,
    sendAccountApprovedEmail,
    sendAccountRejectedEmail,
    sendAccountSuspendedEmail,
    sendRoleChangedEmail
} from '../services/mailer.js';
import {
    generateAccessToken,
    generateRefreshToken,
    storeRefreshToken,
    refreshAccessToken as refreshTokenController,
    revokeRefreshToken
} from '../controller/tokencontroller.js';

const router = express.Router();
const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});
const SALT_ROUNDS = 12;

// Helper function to validate password strength
const isStrongPassword = (password) => {
    const minLength = 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return password.length >= minLength && hasUppercase && hasLowercase && hasNumbers && hasSpecialChar;
};

// Helper to get client IP
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || req.socket.remoteAddress;
};

// Helper to log audit event
const logAuditEvent = async (userId, actionType, actionDetails = null, performedBy = null, ipAddress = null) => {
    try {
        await prisma.auditLog.create({
            data: {
                userId,
                actionType,
                actionDetails: actionDetails ? JSON.stringify(actionDetails) : null,
                performedBy,
                ipAddress,
            }
        });
    } catch (error) {
        console.error('Error logging audit event:', error);
    }
};

// ================================================================
// 1. REGISTRATION ENDPOINT
// ================================================================
router.post('/register', authLimiter, async (req, res) => {
    const { email, password, confirmPassword, name, role } = req.body;
    const clientIP = getClientIP(req);

    // Validation
    if (!email || !password || !confirmPassword || !name || !role) {
        return res.status(400).json({
            success: false,
            message: "All fields are required."
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({
            success: false,
            message: "Passwords do not match."
        });
    }

    if (!isStrongPassword(password)) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters."
        });
    }

    const validRoles = ['MANAGEMENT', 'PRODUCTION', 'MERCHANDISE', 'MARKETING'];
    if (!validRoles.includes(role.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: "Invalid role specified."
        });
    }

    try {
        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email is already registered."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Create user
        const newUser = await prisma.user.create({
            data: {
                email: email.toLowerCase(),
                name,
                passwordHash,
                role: role.toUpperCase(),
                status: 'PENDING', // Default pending status
            }
        });

        // Log audit event
        await logAuditEvent(newUser.id, 'REGISTERED', { role: role.toUpperCase() }, null, clientIP);

        // Send welcome email
        try {
            await sendWelcomeEmail(newUser.email, newUser.name, newUser.role);
        } catch (emailError) {
            console.error('Error sending welcome email:', emailError);
            // Don't fail the registration if email fails
        }

        return res.status(201).json({
            success: true,
            message: "Registration successful! Your account is pending management approval. Check your email for confirmation.",
            user: {
                id: newUser.id,
                email: newUser.email,
                name: newUser.name,
                role: newUser.role,
                status: newUser.status
            }
        });

    } catch (error) {
        console.error("Registration Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during registration."
        });
    }
});

// ================================================================
// 2. LOGIN ENDPOINT
// ================================================================
router.post('/login', authLimiter, async (req, res) => {
    const { email, password } = req.body;
    const clientIP = getClientIP(req);

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: "Email and password are required."
        });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials."
            });
        }

        // Check if account is locked
        if (user.lockedUntil && new Date() < user.lockedUntil) {
            return res.status(403).json({
                success: false,
                message: "Account is temporarily locked due to multiple failed login attempts. Try again later."
            });
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            // Increment failed login attempts
            const newAttempts = user.loginAttempts + 1;
            let lockUntil = null;

            // Lock account after 5 failed attempts for 15 minutes
            if (newAttempts >= 5) {
                lockUntil = new Date(Date.now() + 15 * 60 * 1000);
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: newAttempts,
                    lockedUntil: lockUntil
                }
            });

            await logAuditEvent(user.id, 'LOGIN_FAILED', { reason: 'Invalid password' }, null, clientIP);

            return res.status(401).json({
                success: false,
                message: "Invalid credentials."
            });
        }

        // Check account status
        if (user.status !== 'APPROVED') {
            await logAuditEvent(user.id, 'LOGIN_FAILED', { reason: `Account ${user.status}` }, null, clientIP);

            return res.status(403).json({
                success: false,
                status: user.status,
                message: `Your account is ${user.status.toLowerCase()}. Please contact management.`
            });
        }

        // Check if account is suspended
        if (user.status === 'SUSPENDED') {
            return res.status(403).json({
                success: false,
                message: "Your account has been suspended. Please contact administration."
            });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // Store refresh token in database
        await storeRefreshToken(refreshToken, user.id, clientIP, req.headers['user-agent']);

        // Update last login
        await prisma.user.update({
            where: { id: user.id },
            data: {
                lastLoginAt: new Date(),
                lastLoginIp: clientIP,
                loginAttempts: 0, // Reset failed attempts on successful login
                lockedUntil: null
            }
        });

        await logAuditEvent(user.id, 'LOGIN_ATTEMPT', { status: 'successful' }, null, clientIP);

        // Set refresh token as httpOnly cookie
        res.cookie('refreshtoken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        return res.json({
            success: true,
            message: "Login successful!",
            accesstoken: accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error during login."
        });
    }
});

// ================================================================
// 3. REFRESH TOKEN ENDPOINT
// ================================================================
router.post('/refresh', authLimiter, async (req, res) => {
    try {
        const refreshtoken = req.cookies['refreshtoken'];
        const authHeader = req.headers['authorization'];
        const accesstoken = authHeader && authHeader.split(' ')[1];
        const clientIP = getClientIP(req);

        if (!refreshtoken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token not found. Please log in again."
            });
        }

        // Use the token controller to refresh
        const { accessToken, refreshToken } = await refreshTokenController(refreshtoken, accesstoken, clientIP);

        // Set new refresh token as cookie
        res.cookie('refreshtoken', refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.json({
            success: true,
            message: "Token refreshed successfully",
            accesstoken: accessToken
        });

    } catch (error) {
        console.error("Token Refresh Error:", error.message);
        return res.status(401).json({
            success: false,
            message: error.message || "Failed to refresh token. Please log in again."
        });
    }
});

// ================================================================
// 4. LOGOUT ENDPOINT
// ================================================================
router.post('/logout', checktoken, async (req, res) => {
    try {
        const refreshtoken = req.cookies['refreshtoken'];
        const clientIP = getClientIP(req);

        if (refreshtoken) {
            // Revoke the refresh token
            await revokeRefreshToken(refreshtoken);
        }

        await logAuditEvent(req.user.id, 'LOGIN_ATTEMPT', { status: 'logout' }, null, clientIP);

        // Clear cookie
        res.clearCookie('refreshtoken');

        return res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Logout Error:", error);
        return res.status(500).json({
            success: false,
            message: "Error during logout"
        });
    }
});

// ================================================================
// 5. MANAGEMENT - GET PENDING USERS
// ================================================================
router.get('/admin/pending-users', checktoken, requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    try {
        const pendingUsers = await prisma.user.findMany({
            where: { status: 'PENDING' },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                createdAt: true
            },
            orderBy: { createdAt: 'asc' }
        });

        return res.json({
            success: true,
            count: pendingUsers.length,
            users: pendingUsers
        });

    } catch (error) {
        console.error("Error fetching pending users:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch pending users."
        });
    }
});

// ================================================================
// 6. MANAGEMENT - APPROVE USER
// ================================================================
router.patch('/admin/users/:id/approve', checktoken, requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    try {
        const { id } = req.params;
        const clientIP = getClientIP(req);

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.status === 'APPROVED') {
            return res.status(400).json({
                success: false,
                message: "User is already approved."
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                status: 'APPROVED',
                updatedAt: new Date()
            }
        });

        await logAuditEvent(id, 'APPROVED', { approvedBy: req.user.id }, req.user.id, clientIP);

        // Send approval email
        try {
            await sendAccountApprovedEmail(updatedUser.email, updatedUser.name, updatedUser.role);
        } catch (emailError) {
            console.error('Error sending approval email:', emailError);
        }

        return res.json({
            success: true,
            message: "User approved successfully! Notification email sent.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                role: updatedUser.role,
                status: updatedUser.status
            }
        });

    } catch (error) {
        console.error("Approval Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to approve user."
        });
    }
});

// ================================================================
// 7. MANAGEMENT - REJECT USER
// ================================================================
router.patch('/admin/users/:id/reject', checktoken, requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const clientIP = getClientIP(req);

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.status !== 'PENDING') {
            return res.status(400).json({
                success: false,
                message: "Can only reject pending users."
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                status: 'REJECTED',
                updatedAt: new Date()
            }
        });

        await logAuditEvent(id, 'REJECTED', { reason: reason || 'No reason provided', rejectedBy: req.user.id }, req.user.id, clientIP);

        // Send rejection email
        try {
            await sendAccountRejectedEmail(updatedUser.email, updatedUser.name, reason);
        } catch (emailError) {
            console.error('Error sending rejection email:', emailError);
        }

        return res.json({
            success: true,
            message: "User rejected successfully! Notification email sent.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                status: updatedUser.status
            }
        });

    } catch (error) {
        console.error("Rejection Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to reject user."
        });
    }
});

// ================================================================
// 8. MANAGEMENT - CHANGE USER ROLE
// ================================================================
router.patch('/admin/users/:id/role', checktoken, requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    try {
        const { id } = req.params;
        const { role } = req.body;
        const clientIP = getClientIP(req);

        if (!role) {
            return res.status(400).json({
                success: false,
                message: "New role is required."
            });
        }

        const validRoles = ['MANAGEMENT', 'PRODUCTION', 'MERCHANDISE', 'MARKETING'];
        if (!validRoles.includes(role.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: "Invalid role specified."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.role === role.toUpperCase()) {
            return res.status(400).json({
                success: false,
                message: "User already has this role."
            });
        }

        const oldRole = user.role;
        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                role: role.toUpperCase(),
                updatedAt: new Date()
            }
        });

        await logAuditEvent(id, 'ROLE_CHANGED', { oldRole, newRole: role.toUpperCase(), changedBy: req.user.id }, req.user.id, clientIP);

        // Send role change email
        try {
            await sendRoleChangedEmail(updatedUser.email, updatedUser.name, updatedUser.role, oldRole);
        } catch (emailError) {
            console.error('Error sending role change email:', emailError);
        }

        return res.json({
            success: true,
            message: "User role changed successfully! Notification email sent.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                oldRole,
                newRole: updatedUser.role
            }
        });

    } catch (error) {
        console.error("Role Change Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to change user role."
        });
    }
});

// ================================================================
// 9. MANAGEMENT - SUSPEND USER
// ================================================================
router.patch('/admin/users/:id/suspend', checktoken, requireRole('MANAGEMENT'), checkApproved, async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const clientIP = getClientIP(req);

        const user = await prisma.user.findUnique({
            where: { id }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        if (user.status === 'SUSPENDED') {
            return res.status(400).json({
                success: false,
                message: "User is already suspended."
            });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: {
                status: 'SUSPENDED',
                updatedAt: new Date()
            }
        });

        await logAuditEvent(id, 'SUSPENDED', { reason: reason || 'No reason provided', suspendedBy: req.user.id }, req.user.id, clientIP);

        // Send suspension email
        try {
            await sendAccountSuspendedEmail(updatedUser.email, updatedUser.name, reason);
        } catch (emailError) {
            console.error('Error sending suspension email:', emailError);
        }

        return res.json({
            success: true,
            message: "User suspended successfully! Notification email sent.",
            user: {
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                status: updatedUser.status
            }
        });

    } catch (error) {
        console.error("Suspension Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to suspend user."
        });
    }
});

// ================================================================
// 10. GET CURRENT USER PROFILE
// ================================================================
router.get('/profile', checktoken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                department: true,
                lastLoginAt: true,
                createdAt: true
            }
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.json({
            success: true,
            user
        });

    } catch (error) {
        console.error("Error fetching profile:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch profile."
        });
    }
});

// ================================================================
// 11. CHANGE PASSWORD
// ================================================================
router.post('/change-password', checktoken, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const clientIP = getClientIP(req);

        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All fields are required."
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match."
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: "New password must be different from current password."
            });
        }

        if (!isStrongPassword(newPassword)) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters and contain uppercase, lowercase, numbers, and special characters."
            });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id }
        });

        const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect."
            });
        }

        const newPasswordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                passwordHash: newPasswordHash,
                isPasswordChanged: true
            }
        });

        await logAuditEvent(req.user.id, 'PASSWORD_CHANGED', {}, null, clientIP);

        return res.json({
            success: true,
            message: "Password changed successfully."
        });

    } catch (error) {
        console.error("Password Change Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to change password."
        });
    }
});

export default router;