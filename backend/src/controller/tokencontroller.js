import jwt from 'jsonwebtoken';
import { PrismaClient } from '../generated/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const prisma = new PrismaClient({
    adapter: new PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

if (!JWT_ACCESS_SECRET || !JWT_REFRESH_SECRET) {
    throw new Error('JWT secrets not configured in environment variables');
}

/**
 * Generate Access Token
 * @param {Object} user - User object with id, role, status
 * @returns {string} Signed access token
 */
export function generateAccessToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
    };
    return jwt.sign(payload, JWT_ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate Refresh Token
 * @param {Object} user - User object
 * @returns {string} Signed refresh token
 */
export function generateRefreshToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Store Refresh Token in Database
 * @param {string} token - Refresh token
 * @param {string} userId - User ID
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - Client user agent
 * @returns {Object} Stored token data
 */
export async function storeRefreshToken(token, userId, ipAddress, userAgent) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    try {
        return await prisma.refreshToken.create({
            data: {
                token,
                userId,
                ipAddress,
                userAgent,
                expiresAt,
            },
        });
    } catch (error) {
        console.error('Error storing refresh token:', error);
        throw error;
    }
}

/**
 * Verify and Refresh Access Token
 * @param {string} refreshTokenFromCookie - Refresh token from cookie
 * @param {string} accessTokenFromHeader - Access token from Authorization header
 * @param {string} ipAddress - Client IP address
 * @returns {Object} { accessToken, refreshToken }
 */
export async function refreshAccessToken(refreshTokenFromCookie, accessTokenFromHeader, ipAddress) {
    let currentAccessToken = accessTokenFromHeader;
    let currentRefreshToken = refreshTokenFromCookie;

    try {
        // 1. Verify Access Token - if still valid, no need to refresh
        try {
            jwt.verify(currentAccessToken, JWT_ACCESS_SECRET);
            console.log('Access token is still valid');
            return { accessToken: currentAccessToken, refreshToken: currentRefreshToken };
        } catch (err) {
            if (err.name !== 'TokenExpiredError') {
                throw err; // Other errors should not be swallowed
            }
            console.log('Access token expired, attempting to refresh...');
        }

        // 2. Verify Refresh Token
        if (!currentRefreshToken) {
            throw new Error('No refresh token provided');
        }

        let decodedRefresh;
        try {
            decodedRefresh = jwt.verify(currentRefreshToken, JWT_REFRESH_SECRET);
        } catch (err) {
            throw new Error('Refresh token invalid or expired');
        }

        // 3. Verify refresh token exists in database and hasn't been revoked
        const storedRefreshToken = await prisma.refreshToken.findUnique({
            where: { token: currentRefreshToken },
            include: { user: true },
        });

        if (!storedRefreshToken) {
            throw new Error('Refresh token not found in database');
        }

        if (new Date() > storedRefreshToken.expiresAt) {
            await prisma.refreshToken.delete({
                where: { token: currentRefreshToken },
            });
            throw new Error('Refresh token has expired');
        }

        // 4. Check if user is still approved
        if (storedRefreshToken.user.status !== 'APPROVED') {
            throw new Error(`User account is ${storedRefreshToken.user.status}`);
        }

        // 5. Generate new tokens
        const newAccessToken = generateAccessToken(storedRefreshToken.user);
        const newRefreshToken = generateRefreshToken(storedRefreshToken.user);

        // 6. Store new refresh token in database
        await storeRefreshToken(newRefreshToken, storedRefreshToken.userId, ipAddress, '');

        // 7. Invalidate old refresh token (rotate)
        await prisma.refreshToken.delete({
            where: { id: storedRefreshToken.id },
        });

        return {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
        };
    } catch (error) {
        console.error('Token refresh error:', error.message);
        throw error;
    }
}

/**
 * Revoke Refresh Token (Logout)
 * @param {string} token - Refresh token to revoke
 */
export async function revokeRefreshToken(token) {
    try {
        await prisma.refreshToken.delete({
            where: { token },
        });
        return { success: true, message: 'Token revoked successfully' };
    } catch (error) {
        console.error('Error revoking token:', error);
        throw error;
    }
}

/**
 * Clean up expired refresh tokens (should be run periodically)
 */
export async function cleanupExpiredTokens() {
    try {
        const deleted = await prisma.refreshToken.deleteMany({
            where: {
                expiresAt: {
                    lt: new Date(),
                },
            },
        });
        console.log(`Cleaned up ${deleted.count} expired refresh tokens`);
        return deleted;
    } catch (error) {
        console.error('Error cleaning up expired tokens:', error);
        throw error;
    }
}