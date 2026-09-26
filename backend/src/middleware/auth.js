const { verifyToken } = require('../utils/auth');
const prisma = require('../db');

/**
 * Authentication Middleware
 * Enforces valid Bearer JWT on protected endpoints
 */
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required. Missing Bearer token.',
      code: 'AUTH_TOKEN_MISSING',
    });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      error: 'Malformed authorization header.',
      code: 'AUTH_TOKEN_MALFORMED',
    });
  }

  try {
    const decoded = verifyToken(token);
    
    // Attach decoded user payload to request
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Authentication token has expired. Please log in again.',
        code: 'AUTH_TOKEN_EXPIRED',
      });
    }

    return res.status(401).json({
      error: 'Invalid authentication token.',
      code: 'AUTH_TOKEN_INVALID',
    });
  }
}

/**
 * Optional Authentication Middleware
 * Attaches user context if valid token present, but does not block if omitted
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        req.user = verifyToken(token);
      } catch (err) {
        // Silently continue for optional auth
      }
    }
  }

  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
};
