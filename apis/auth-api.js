const express = require('express');
const router = express.Router();
const { User, UserCredential, Role, UserAvatar, Permission, Feature, PermissionAction } = require('../models');
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');
const config = require('../config/config');
const manageUsers = require('../services/UserService');
const { sendPasswordResetEmail } = require('../services/emailService');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
 *         email:
 *           type: string
 *           format: email
 *           description: The user's email
 *         firstName:
 *           type: string
 *           description: The user's first name
 *         lastName:
 *           type: string
 *           description: The user's last name
 *         roleId:
 *           type: integer
 *           description: The user's role ID
 *         role:
 *           $ref: '#/components/schemas/RoleBase'
 *         avatarId:
 *           type: integer
 *           description: The user's avatar ID
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PermissionBase'
 *     RoleBase:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The user's name
 *         permissions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PermissionBase'
 *     PermissionBase:
 *       type: object
 *       properties:
 *         code:
 *           type: string
 *           description: The permission code
 *     UserCredential:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the credential.
 *         userId:
 *           type: integer
 *           description: The ID of the user this credential belongs to.
 *         authType:
 *           type: string
 *           enum: [password, openid]
 *           description: The authentication type.
 *         loginName:
 *           type: string
 *           description: The login name associated with the credential.
 *         lastPasswordChange:
 *           type: string
 *           format: date-time
 *           description: The timestamp of the last password change.
 *         passwordExpired:
 *           type: boolean
 *           description: Flag indicating if the password has expired.
 *         openIdProvider:
 *           type: string
 *           description: The OpenID provider name.
 *         openIdSubject:
 *           type: string
 *           description: The subject/identifier from the OpenID provider.
 *         isActive:
 *           type: boolean
 *           description: Flag indicating if the credential is active.
 *       example:
 *         id: 1
 *         userId: 101
 *         authType: "password"
 *         loginName: "john.doe"
 *         lastPasswordChange: "2023-10-27T10:00:00Z"
 *         passwordExpired: false
 *         isActive: true
 *     AuthResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Response message
 *         token:
 *           type: string
 *           description: JWT authentication token
 *         user:
 *           $ref: '#/components/schemas/User'
 *     LoginRequest:
 *       type: object
 *       required:
 *         - loginName
 *         - password
 *       properties:
 *         loginName:
 *           type: string
 *           description: User's login name
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *     RegisterRequest:
 *       type: object
 *       required:
 *         - email
 *         - password
 *         - firstName
 *         - lastName
 *         - loginName
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         password:
 *           type: string
 *           format: password
 *           description: User's password
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         loginName:
 *           type: string
 *           description: User's login name
 *         roleId:
 *           type: integer
 *           description: Optional role ID
 */

// Helper function to generate JWT token
const generateToken = (user, credential) => {
  return jwt.sign(
    { 
      userId: user.id,
      email: user.email,
      loginName: credential.loginName,
      authType: credential.authType,
      roleId: user.roleId,
      avatarId: user.avatarId
    }, 
    config.jwt.secret, 
    { expiresIn: config.jwt.expiresIn }
  );
};

/**
 * Helper function to hash passwords
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  return {
    hash: await bcrypt.hash(password, salt),
    salt
  };
};

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication token required' });
  }
  
  jwt.verify(token, config.jwt.secret, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication API
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login with password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Invalid credentials or expired password
 *       500:
 *         description: Server error
 */
router.post('/login', async (req, res) => {
  const { loginName, password } = req.body;
  
  if (!loginName || !password) {
    return res.status(400).json({ message: 'Login name and password are required' });
  }
  
  try {
    // Find the user credential
    const credential = await UserCredential.findOne({
      where: {
        loginName,
        authType: 'password',
        isActive: true,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'user',
          where: {
            isActive: true,
            isDeleted: false
          },
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'name']
            },
            {
              model: UserAvatar,
              as: 'avatar',
              attributes: ['id']
            }
          ]
        }
      ]
    });
    
    if (!credential) {
      return res.status(401).json({ message: 'Invalid login credentials' });
    }
    
    // Check if password is expired
    if (credential.passwordExpired) {
      return res.status(401).json({ message: 'Password has expired. Please reset your password.' });
    }
    
    // Verify password
    const isPasswordValid = await bcrypt.compare(password, credential.passwordHash);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid login credentials' });
    }

    const roleWithPermissions = await Role.findByPk(credential.user.roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] } // Exclude junction table attributes
      }]
    });

    const permissions = roleWithPermissions ? roleWithPermissions.permissions.map(p => p.code) : [];
    
    console.log(`Permissions: ${permissions}`);
    
    // Generate JWT token
    const token = generateToken(credential.user, credential);
    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: credential.user.id,
        email: credential.user.email,
        firstName: credential.user.firstName,
        lastName: credential.user.lastName,
        role: credential.user.role,
        avatarId: credential.user.avatar?.id ?? 0,
        permissions
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       409:
 *         description: Conflict - Login name already in use
 *       500:
 *         description: Server error
 */
router.post('/register', async (req, res) => {
  const { email, password, firstName, lastName, loginName, roleId } = req.body;
  
  if (!email || !password || !firstName || !lastName || !loginName) {
    return res.status(400).json({ message: 'Email, password, first name, last name, and login name are required' });
  }

  try {
    const result = await manageUsers.registerUser({
      email,
      password,
      firstName,
      lastName,
      loginName,
      roleId
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Registration error:', err);
    const statusCode = err.message.includes('already in use') ? 409 : 500;
    res.status(statusCode).json({ 
      message: err.message || 'Registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});


/**
 * @swagger
 * /api/auth/openid:
 *   post:
 *     summary: Login or register with OpenID
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - subject
 *               - email
 *               - loginName
 *             properties:
 *               provider:
 *                 type: string
 *                 description: OpenID provider name
 *               subject:
 *                 type: string
 *                 description: OpenID subject identifier
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *               firstName:
 *                 type: string
 *                 description: User's first name
 *               lastName:
 *                 type: string
 *                 description: User's last name
 *               loginName:
 *                 type: string
 *                 description: User's login name
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/openid', async (req, res) => {
  const { provider, subject, email, firstName, lastName, loginName } = req.body;
  
  if (!provider || !subject || !email || !loginName) {
    return res.status(400).json({ message: 'Provider, subject, email, and login name are required' });
  }
  
  // Start a transaction
  const transaction = await sequelize.transaction();
  
  try {
    // Check if OpenID credential already exists
    let credential = await UserCredential.findOne({
      where: {
        openIdProvider: provider,
        openIdSubject: subject,
        isActive: true,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'user',
          include: [
            {
              model: Role,
              as: 'role',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      transaction
    });
    
    let user;
    
    if (credential) {
      // Existing user - update information if needed
      user = credential.user;
      
      // Update user information if provided
      if (firstName || lastName) {
        await user.update({
          firstName: firstName || user.firstName,
          lastName: lastName || user.lastName
        }, { transaction });
      }
    } else {
      // Check if user with this email exists
      user = await User.findOne({
        where: { email },
        transaction
      });
      
      if (!user) {
        // Create new user
        user = await User.create({
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          roleId: 1, // Default role
          isActive: true,
          isDeleted: false
        }, { transaction });
      }
      
      // Create new OpenID credential
      credential = await UserCredential.create({
        userId: user.id,
        authType: 'openid',
        loginName,
        openIdProvider: provider,
        openIdSubject: subject,
        isActive: true,
        isDeleted: false
      }, { transaction });
    }
    
    // Commit the transaction
    await transaction.commit();

    const roleWithPermissions = await Role.findByPk(user.roleId, {
      include: [{
        model: Permission,
        as: 'permissions',
        through: { attributes: [] } // Exclude junction table attributes
      }]
    });

    const permissions = roleWithPermissions ? roleWithPermissions.permissions : [];
    
    console.log(`Permissions: ${permissions}`);
    
    // Generate JWT token
    const token = generateToken(user, credential);
    
    res.json({
      message: 'OpenID authentication successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions
      }
    });
  } catch (err) {
    // Rollback the transaction in case of error
    await transaction.rollback();
    console.error('OpenID authentication error:', err);
    res.status(500).json({ message: 'Authentication failed', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/change-password:
 *   post:
 *     summary: Change password (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *                 description: Current password
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Not authenticated
 *       500:
 *         description: Server error
 */
router.post('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current password and new password are required' });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }
  
  try {
    // Find the user credential
    const credential = await UserCredential.findOne({
      where: {
        userId,
        authType: 'password',
        isActive: true,
        isDeleted: false
      }
    });
    
    if (!credential) {
      return res.status(400).json({ message: 'No password credential found for this user' });
    }
    
    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, credential.passwordHash);
    
    if (!isPasswordValid) {
      // DO NOT SET IT TO 401. 401 ERROR INVALIDATES TOKEN AUTOMATICALLY
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Hash the new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update the credential
    await credential.update({
      passwordHash: hash,
      passwordSalt: salt,
      lastPasswordChange: new Date(),
      passwordExpired: false
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('Password change error:', err);
    res.status(500).json({ message: 'Password change failed', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/reset-password-request:
 *   post:
 *     summary: Request a password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset request successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.post('/reset-password-request', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const user = await User.findOne({ where: { email } });
    
    // Always return success to prevent email enumeration attacks
    if (!user) {
      console.log('Password reset requested for non-existent email:', email);
      return res.json({ 
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    }
    
    const resetToken = jwt.sign(
      { userId: user.id, email: user.email },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
    
    try {
      await sendPasswordResetEmail(email, resetToken);
      console.log('Password reset email sent to:', email);
      
      res.json({
        message: 'If an account with that email exists, a password reset link has been sent.'
      });
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      res.status(500).json({ 
        message: 'Failed to send password reset email',
        error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
      });
    }
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ 
      message: 'Password reset request failed', 
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

/**
 * @swagger
 * /api/auth/reset-password-confirm:
 *   post:
 *     summary: Confirm password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *                 description: Password reset token
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 description: New password
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Invalid reset token
 *       500:
 *         description: Server error
 */
router.post('/reset-password-confirm', async (req, res) => {
  const { resetToken, newPassword } = req.body;
  
  if (!resetToken || !newPassword) {
    return res.status(400).json({ message: 'Reset token and new password are required' });
  }
  
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }
  
  try {
    // Verify the reset token
    const decoded = jwt.verify(resetToken, config.jwt.secret);
    
    // Find the user credential
    const credential = await UserCredential.findOne({
      where: {
        userId: decoded.userId,
        authType: 'password',
        isActive: true,
        isDeleted: false
      }
    });
    
    if (!credential) {
      return res.status(404).json({ message: 'Invalid reset token' });
    }
    
    // Hash the new password
    const { hash, salt } = await hashPassword(newPassword);
    
    // Update the credential
    await credential.update({
      passwordHash: hash,
      passwordSalt: salt,
      lastPasswordChange: new Date(),
      passwordExpired: false
    });
    
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Invalid or expired reset token' });
    }
    
    console.error('Password reset confirmation error:', err);
    res.status(500).json({ message: 'Password reset failed', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user information (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.userId, {
      attributes: ['id', 'email', 'firstName', 'lastName', 'roleId'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user);
  } catch (err) {
    console.error('Get user info error:', err);
    res.status(500).json({ message: 'Failed to get user information', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/credentials:
 *   get:
 *     summary: Get user credentials (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserCredential'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/credentials', authenticateToken, async (req, res) => {
  try {
    const credentials = await UserCredential.findAll({
      where: {
        userId: req.user.userId,
        isActive: true,
        isDeleted: false
      },
      attributes: ['id', 'authType', 'loginName', 'openIdProvider', 'lastPasswordChange', 'passwordExpired', 'createdAt']
    });
    
    res.json(credentials);
  } catch (err) {
    console.error('Get credentials error:', err);
    res.status(500).json({ message: 'Failed to get credentials', error: err.message });
  }
});

/**
 * @swagger
 * /api/auth/credentials/{id}:
 *   delete:
 *     summary: Delete a user credential (requires authentication)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Credential ID
 *     responses:
 *       200:
 *         description: Credential deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized to delete this credential
 *       404:
 *         description: Credential not found
 *       500:
 *         description: Server error
 */
router.delete('/credentials/:id', authenticateToken, async (req, res) => {
  const credentialId = req.params.id;
  
  try {
    const credential = await UserCredential.findOne({
      where: {
        id: credentialId,
        userId: req.user.userId,
        isActive: true,
        isDeleted: false
      }
    });
    
    if (!credential) {
      return res.status(404).json({ message: 'Credential not found' });
    }
    
    // Count active credentials for this user
    const credentialCount = await UserCredential.count({
      where: {
        userId: req.user.userId,
        isActive: true,
        isDeleted: false
      }
    });
    
    // Don't allow deleting the last credential
    if (credentialCount <= 1) {
      return res.status(400).json({ message: 'Cannot delete the only credential for this user' });
    }
    
    // Soft delete the credential
    await credential.update({
      isActive: false,
      isDeleted: true
    });
    
    res.json({ message: 'Credential deleted successfully' });
  } catch (err) {
    console.error('Delete credential error:', err);
    res.status(500).json({ message: 'Failed to delete credential', error: err.message });
  }
});

module.exports = router;
