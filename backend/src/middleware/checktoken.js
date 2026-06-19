import express from 'express';
import 'dotenv/config';
import jwt from 'jsonwebtoken'

const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

if (!JWT_ACCESS_SECRET) {
    throw new Error('JWT_ACCESS_SECRET not configured in environment variables');
}

export const checktoken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        console.error('No token provided');
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    try {
        // Use ACCESS_SECRET for verifying access tokens
        const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            console.error('Access token expired');
            return res.status(401).json({ 
                success: false, 
                message: 'Access token expired. Please refresh your token.',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (err.name === 'JsonWebTokenError') {
            console.error('Invalid token:', err.message);
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid access token' 
            });
        }
        console.error('Token verification error:', err);
        return res.status(401).json({ success: false, message: 'Token verification failed' });
    }
}