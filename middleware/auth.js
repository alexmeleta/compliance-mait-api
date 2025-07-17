const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { User, Role } = require('../models');

/**
 * Authentication middleware to validate JWT tokens
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  jwt.verify(token, config.jwt.secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
};

/**
 * Role-based authorization middleware
 * @param {...number} roles - Role IDs that are allowed to access the route
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const userRole = req.user.roleId;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({ 
        message: 'Insufficient permissions to access this resource' 
      });
    }
    
    next();
  };
};

/**
 * Higher-level guard that validates token and fetches complete user data
 * This extends the basic authenticateToken by also loading the full user record
 */
const authGuard = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
  
    if (!token) {
      return res.status(401).json({ message: 'Authentication token required' });
    }
  
    try {
      // Verify the token
      const decoded = jwt.verify(token, config.jwt.secret);
  
      // Load the user, their role, and the permissions linked to that role
      const user = await User.findOne({
        where: { 
          id: decoded.userId,
          isActive: true,
          isDeleted: false
        },
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name'],
            include: [
              {
                model: require('../models/Permission'),
                as: 'permissions',
                through: { attributes: [] }, // Exclude RolePermission join table from result
                attributes: ['code']
              }
            ]
          }
        ]
      });
      req.user = decoded;

      if (!user) {
        return res.status(403).json({ message: 'User not found or inactive' });
      }

      if (!req.user.userId) {
        req.user.userId = req.user.id;
        user.userId = user.id
        //return res.status(403).json({ message: 'User.userId not provided. ' + JSON.stringify(user) });
      }
  
      if (!req.user.userId) {
        return res.status(403).json({ message: 'User.userId not provided. ' + JSON.stringify(req.user) });
      }

      req.userRecord = user;
  
      // Extract permission codes from user's role
      req.permissions = (user.role && user.role.permissions)
        ? user.role.permissions.map(p => p.code)
        : [];
  
      next();
    } catch (err) {
      if (err.name === 'JsonWebTokenError') {
        return res.status(403).json({ message: 'Invalid token' });
      } else if (err.name === 'TokenExpiredError') {
        return res.status(403).json({ message: 'Token expired' });
      } else {
        console.error('Auth guard error:', err);
        return res.status(500).json({ message: 'Internal server error during authentication' });
      }
    }
  };

/**
 * Permission-based authorization guard
 * Checks if the user has specific permissions based on their role
 * @param {...string} permissions - Required permissions to access the route
 */
const requirePermissions = (...permissions) => {
  return (req, res, next) => {
    console.log('requirePermissions');

    if (!req.userRecord || !req.userRecord.role) {
      return res.status(401).json({ message: 'Authentication required with full user record' });
    }

    // Get user permissions from their role
    const userPermissions = req.userRecord.role.permissions || [];
    
    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission => 
      userPermissions.includes(permission)
    );
    
    if (!hasAllPermissions) {
      return res.status(403).json({ 
        message: 'You do not have the required permissions to access this resource' 
      });
    }
    
    next();
  };
};

/**
 * Owner guard - ensures users can only access their own resources
 * @param {Function} getResourceOwnerId - Function that extracts the owner ID from the request
 */
const ownerGuard = (getResourceOwnerId) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    try {
      // Get the owner ID of the requested resource
      const ownerId = await getResourceOwnerId(req);
      
      // Allow access if the user is the owner or has admin role (assuming roleId 1 is admin)
      if (req.user.userId === ownerId || req.user.roleId === 1) {
        next();
      } else {
        res.status(403).json({ message: 'You do not have permission to access this resource' });
      }
    } catch (err) {
      console.error('Owner guard error:', err);
      res.status(500).json({ message: 'Error determining resource ownership' });
    }
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles,
  authGuard,
  requirePermissions,
  ownerGuard
};