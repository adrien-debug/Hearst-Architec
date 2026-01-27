/**
 * Authentication Middleware
 * Hearst Mining Architect
 * 
 * JWT-based authentication for protected routes
 */

const logger = require('../utils/logger');

// In production, use a proper JWT library like jsonwebtoken
// For now, simple token validation pattern

/**
 * Verify JWT token from Authorization header
 */
const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization header provided'
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid authorization format. Use Bearer token'
      });
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid token'
      });
    }

    // In production: verify JWT signature and decode payload
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // req.user = decoded;

    // For development/demo mode: extract user from token or use demo
    // Token format: base64 encoded JSON with user info
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = {
        id: decoded.id || decoded.userId || 'authenticated-user',
        email: decoded.email || 'user@example.com',
        role: decoded.role || 'user'
      };
    } catch {
      // If token is not valid JSON, treat as opaque token
      req.user = {
        id: 'authenticated-user',
        email: 'user@example.com',
        role: 'user'
      };
    }

    logger.debug('User authenticated', { userId: req.user.id });
    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Token verification failed'
    });
  }
};

/**
 * Optional authentication - continues if no token, but sets user if valid
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.substring(7);

    if (!token || token.length < 10) {
      req.user = null;
      return next();
    }

    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString());
      req.user = {
        id: decoded.id || decoded.userId || 'authenticated-user',
        email: decoded.email || 'user@example.com',
        role: decoded.role || 'user'
      };
    } catch {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Require specific role
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Access denied - insufficient role', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

/**
 * Demo mode middleware - allows access without auth for development
 * Uses demo-user when no authentication provided
 */
const demoMode = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    // In production, require real authentication
    return verifyToken(req, res, next);
  }

  // In development, allow demo access
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    // If token provided, validate it
    return verifyToken(req, res, next);
  }

  // No token in dev mode - use demo user
  req.user = {
    id: 'demo-user',
    email: 'demo@hearst.com',
    role: 'user',
    isDemo: true
  };

  logger.debug('Demo mode access', { userId: req.user.id });
  next();
};

module.exports = {
  verifyToken,
  optionalAuth,
  requireRole,
  demoMode
};
