// Middleware to check if user account is approved
export const checkApproved = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ 
            success: false, 
            message: 'User not authenticated' 
        });
    }

    // Allow only APPROVED users
    if (req.user.status !== 'APPROVED') {
        return res.status(403).json({ 
            success: false, 
            message: `Your account is currently ${req.user.status.toLowerCase()}. Access denied.`,
            status: req.user.status
        });
    }

    next();
};

/**
 * Require specific roles for an endpoint
 * @param {...string} allowedRoles - Role names that are allowed
 * @returns {Function} Express middleware
 */
export const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Insufficient permissions.',
                requiredRoles: allowedRoles,
                userRole: req.user.role
            });
        }

        next();
    };
};

/**
 * Allow access to MANAGEMENT role only
 * @returns {Function} Express middleware
 */
export const requireManagement = (req, res, next) => {
    return requireRole('MANAGEMENT')(req, res, next);
};

/**
 * Check if user is MANAGEMENT and account is approved
 * @returns {Function} Express middleware
 */
export const isManagementAndApproved = [checkApproved, requireRole('MANAGEMENT')];