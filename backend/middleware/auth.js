const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            // Get token from header
            token = req.headers.authorization.split(' ')[1];

            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            // Get user from the token
            try {
                // If it looks like a Mongo ID (24 hex chars), try DB
                if (decoded.id && /^[0-9a-fA-F]{24}$/.test(decoded.id)) {
                    req.user = await User.findById(decoded.id).select('-password');
                }

                // If DB failed or ID is a Mock ID
                if (!req.user) {
                    const MemoryStore = require('../utils/memoryStore');
                    req.user = MemoryStore.findUserById(decoded.id);
                }
            } catch (dbErr) {
                console.log("Auth Middleware: DB Check failed, using Mock Store fallback");
                const MemoryStore = require('../utils/memoryStore');
                req.user = MemoryStore.findUserById(decoded.id);
            }

            if (!req.user) {
                return res.status(401).json({ message: 'User not found' });
            }

            // In case user source doesn't include role, fall back to token role.
            if (!req.user.role && decoded.role) {
                req.user.role = decoded.role;
            }

            next();
        } catch (error) {
            console.error('Auth Middleware Error:', error);
            res.status(401).json({ message: 'Not authorized' });
        }
    }

    if (!token) {
        res.status(401).json({ message: 'Not authorized, no token' });
    }
};

// Alias to match RBAC naming
const authMiddleware = protect;

module.exports = { protect, authMiddleware };
