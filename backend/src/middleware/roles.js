/**
 * Role-Based Access Control (RBAC) Middleware
 * Enforces role authorization on protected endpoints
 * 
 * @param  {...string} allowedRoles - List of allowed roles (e.g., 'ORGANIZER', 'ADMIN', 'JUDGE')
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required prior to role verification.',
        code: 'AUTH_REQUIRED',
      });
    }

    const userRole = req.user.role;

    // Normalizing role comparisons
    const normalizedAllowedRoles = allowedRoles.map(r => r.toUpperCase());
    const normalizedUserRole = userRole ? userRole.toUpperCase() : '';

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return res.status(403).json({
        error: `Forbidden: You do not have permission to access this resource. Required role: [${allowedRoles.join(', ')}].`,
        code: 'ROLE_FORBIDDEN',
        requiredRoles: allowedRoles,
        currentRole: userRole,
      });
    }

    next();
  };
}

/**
 * Check if a user object has any of the specified roles
 */
function hasRole(user, ...roles) {
  if (!user || !user.role) return false;
  const normalizedRoles = roles.map(r => r.toUpperCase());
  return normalizedRoles.includes(user.role.toUpperCase());
}

module.exports = {
  requireRole,
  hasRole,
};
