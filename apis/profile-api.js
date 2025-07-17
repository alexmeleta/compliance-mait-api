const express = require('express');
const router = express.Router();
const { User } = require('../models');
const { Op } = require('sequelize');
const Role = require('../models/Role');
const UserAvatar = require('../models/UserAvatar');
const Jurisdiction = require('../models/Jurisdiction');
const UserJurisdiction = require('../models/UserJurisdiction');
const UserName = require('../models/UserName');
const { authGuard, ownerGuard, requirePermissions } = require('../middleware/auth');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     # Base schemas
 *     Role:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The role ID
 *         name:
 *           type: string
 *           enum: [Admin, User, Manager, Auditor]
 *           description: The name of the role
 *
 *     UserBase:
 *       type: object
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           description: User's phone number
 *         address:
 *           type: string
 *           nullable: true
 *           description: User's address
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: User's date of birth (YYYY-MM-DD)
 *
 *     UserResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/UserBase'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The user ID
 *             isActive:
 *               type: boolean
 *               description: Whether the user account is active
 *             roleId:
 *               type: integer
 *               description: The role ID
 *             avatarId:
 *               type: integer
 *               description: The avatar ID
 *             roleName:
 *               type: string
 *               description: The name of the role
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: Creation timestamp
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               description: Last update timestamp
 *
 *     ProfileCreateRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/UserBase'
 *         - type: object
 *           required:
 *             - email
 *             - firstName
 *             - lastName
 *             - roleId
 *           properties:
 *             email:
 *               type: string
 *               format: email
 *               description: User's email address
 *             firstName:
 *               type: string
 *               description: User's first name
 *             lastName:
 *               type: string
 *               description: User's last name
 *             roleId:
 *               type: integer
 *               description: The role ID for the user
 *             password:
 *               type: string
 *               format: password
 *               minLength: 8
 *               description: User's password (required for new users)
 *
 *     ProfileUpdateRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           description: User's first name
 *         lastName:
 *           type: string
 *           description: User's last name
 *         phoneNumber:
 *           type: string
 *           nullable: true
 *           description: User's phone number
 *         address:
 *           type: string
 *           nullable: true
 *           description: User's address
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: User's date of birth (YYYY-MM-DD)
 *         isActive:
 *           type: boolean
 *           description: Whether the user account is active
 *         isAvailableForWork:
 *           type: boolean
 *           description: Whether the user is available for work
 *         roleId:
 *           type: integer
 *           description: The role ID for the user
 */

/**
 * @swagger
 * tags:
 *   name: Profiles
 *   description: API for managing user profiles
 */

/**
 * @swagger
 * /api/profiles:
 *   get:
 *     summary: Get all profiles (admin only)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of profiles
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/UserResponse'
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
router.get('/', 
  authGuard, 
  requirePermissions('LIST_PROFILES'), 
  async (req, res) => {
  try {
    // For the GET / endpoint
    const users = await User.findAll({
      where: {
        isDeleted: false
      },
      attributes: [
        'email', 
        'firstName', 
        'lastName', 
        'phoneNumber',
        'address',
        'dateOfBirth', 
        'isActive', 
        'isDeleted', 
        'createdAt', 
        'updatedAt',
        'roleId',
        'isAvailableForWork'
      ],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name']
        },
        {
          model: UserAvatar,
          as: 'avatar',
          attributes: ['id'],
          required: false
        },
        {
          model: UserJurisdiction,
          as: 'userJurisdictions',
          attributes: ['jurisdictionId']
        },
        {
          model: UserName,
          as: 'alternateNames',
          attributes: ['fullName']
        }
      ]
    });
    
    // Transform the response to include roleName and avatarId
    const transformedUsers = users.map(user => {
      const plainUser = user.get({ plain: true });
      return {
        ...plainUser,
        roleName: plainUser.role ? plainUser.role.name : null,
        avatarId: plainUser.avatar ? plainUser.avatar.id : null,
        role: undefined, // Remove the nested role object
        avatar: undefined // Remove the nested avatar object
      };
    });

    res.json(transformedUsers);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/profiles/me:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       500:
 *         description: Server error
 */
router.get('/me', authGuard, async (req, res) => {
  try {
    // Extract userId directly from the token payload
    const userId = req.user.userId;
    
    // If we need the full user record, it's already available from authGuard
    const user = await User.findOne({
      where: { 
        id: userId,
        isDeleted: false
      },
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['name']
        },
        {
          model: UserAvatar,
          as: 'avatar',
          attributes: ['id'],
          required: false
        },
        {
          model: UserJurisdiction,
          as: 'userJurisdictions',
          include: [{
            model: Jurisdiction,
            as: 'jurisdiction',  // This should match the alias in UserJurisdiction.associate
            attributes: ['id', 'name'],
            required: false
          }]
        },
        {
          model: UserName,
          as: 'alternateNames',
          attributes: ['FullName']
        }
      ]
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const plainUser = user.get({ plain: true });

    const userJurisdictions = plainUser.userJurisdictions;

    const response = {
      id: plainUser.id,
      email: plainUser.email,
      firstName: plainUser.firstName,
      lastName: plainUser.lastName,
      phoneNumber: plainUser.phoneNumber,
      address: plainUser.address,
      dateOfBirth: plainUser.dateOfBirth,
      isActive: plainUser.isActive,
      isAvailableForWork: plainUser.isAvailableForWork,
      roleId: plainUser.roleId,
      roleName: plainUser.role ? plainUser.role.name : null,
      avatarId: plainUser.avatar ? plainUser.avatar.id : null,
      createdAt: plainUser.createdAt,
      updatedAt: plainUser.updatedAt,
      jurisdictions: plainUser.userJurisdictions.map(uj => ({
        id: uj.jurisdiction.id,
        name: uj.jurisdiction.name
      })),
      abn: plainUser.abn,
      alternativeNames: plainUser.alternateNames.map(name => name.FullName)
    };

    res.json(response);
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/profiles/{email}:
 *   get:
 *     summary: Get profile by email
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Email address of the profile to retrieve
 *     responses:
 *       200:
 *         description: Profile details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Not authorized to access this profile
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.get('/:email', 
  authGuard, 
  ownerGuard(async (req) => {
    // Check if the requested profile belongs to the authenticated user
    const email = decodeURIComponent(req.params.email.toLowerCase());
    const user = await User.findOne({
      where: { 
        email,
        isDeleted: false
      }
    });
    return user ? user.id : null;
  }),
  async (req, res) => {
    const email = decodeURIComponent(req.params.email.toLowerCase());
    try {
      const user = await User.findOne({
        where: {
          email,
          isDeleted: false
        },
        attributes: [
          'id',
          'email', 
          'firstName', 
          'lastName', 
          'phoneNumber',
          'address',
          'dateOfBirth', 
          'isActive', 
          'createdAt', 
          'updatedAt',
          'roleId',
          'isAvailableForWork'
        ],
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['name']
          }
        ]
      });

      if (!user) {
        return res.status(404).json({ message: 'Profile not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber,
        address: user.address,
        dateOfBirth: user.dateOfBirth,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        roleId: user.roleId,
        roleName: user.role ? user.role.name : null,
        isAvailableForWork: user.isAvailableForWork
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Database error', error: err.message });
    }
});

/**
 * @swagger
 * /api/profiles:
 *   post:
 *     summary: Create a new profile (admin only)
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileCreateRequest'
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       409:
 *         description: Conflict - Profile with this email already exists
 *       500:
 *         description: Server error
 */
router.post('/', 
  authGuard, 
  requirePermissions('CREATE_PROFILE'), 
  async (req, res) => {
  const { email, password, fullName, dateOfBirth, firstName, lastName, phoneNumber, address } = req.body;

  if (!email || !password || !(fullName || (firstName && lastName))) {
    return res.status(400).json({ message: 'Email, password, and full name are required' });
  }

  // Split fullName if provided
  let fName = firstName, lName = lastName;
  if (fullName && (!firstName || !lastName)) {
    const parts = fullName.trim().split(' ');
    fName = parts[0];
    lName = parts.slice(1).join(' ') || '';
  }

  try {
    // Check for existing user
    const existingUser = await User.findOne({
      where: {
        email: { [Op.iLike]: email.toLowerCase() }
      }
    });
    
    if (existingUser) {
      return res.status(409).json({ message: 'Profile with this email already exists' });
    }

    // Create new user
    const newUser = await User.create({
      email: email.toLowerCase(),
      firstName: fName,
      lastName: lName,
      phoneNumber: phoneNumber || null,
      address: address || null,
      dateOfBirth: dateOfBirth || null,
      roleId: req.userRecord.roleId || null,
      passwordHash: passwordHash,
      abn: abn || null
    });

    // Fetch role name if roleId is provided
    let roleName = null;
    if (req.userRecord.roleId) {
      const role = await Role.findByPk(req.userRecord.roleId);
      if (role) {
        roleName = role.name;
      }
    }

    res.status(201).json({
      message: 'Profile created successfully',
      profile: {
        email: newUser.email,
        roleId: newUser.roleId,
        roleName: roleName,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        phoneNumber: newUser.phoneNumber,
        address: newUser.address,
        dateOfBirth: newUser.dateOfBirth,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        roleName: roleName,
        isAvailableForWork: newUser.isAvailableForWork,
        abn: newUser.abn
      }
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/profiles/{email}:
 *   put:
 *     summary: Update a profile
 *     tags: [Profiles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: email
 *         schema:
 *           type: string
 *         required: true
 *         description: Email of the profile to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileUpdateRequest'
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       400:
 *         description: Bad request - Invalid input
 *       401:
 *         description: Unauthorized - Not authenticated
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Profile not found
 *       500:
 *         description: Server error
 */
router.put('/:email', 
  authGuard,
  ownerGuard(async (req) => {
    // Check if the profile being updated belongs to the authenticated user
    const email = decodeURIComponent(req.params.email.toLowerCase());
    const user = await User.findOne({
      where: { 
        email,
        isDeleted: false
      }
    });
    return user ? user.id : null;
  }),
  async (req, res) => {
    const email = decodeURIComponent(req.params.email.toLowerCase());
    const { 
      firstName, 
      lastName, 
      phoneNumber, 
      address, 
      roleId,
      dateOfBirth,
      isActive,
      isAvailableForWork,
      alternativeNames,
      abn
    } = req.body;
    
    try {
      // Check if user exists and is not deleted
      const user = await User.findOne({
        where: {
          email,
          isDeleted: false
        },
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['name']
          },
          {
            model: UserJurisdiction,
            as: 'userJurisdictions',
            attributes: ['JurisdictionID']
          },
          {
            model: UserName,
            as: 'alternateNames',
            attributes: ['FullName']
          }
        ]
      });
      
      if (!user) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      // Check if the authenticated user is updating their own profile or has admin rights
      // This is redundant with ownerGuard but kept for extra security
      if (req.userRecord.id !== user.id && req.userRecord.roleId !== 1) {
        return res.status(403).json({ message: 'You can only update your own profile unless you are an admin' });
      }

      // Update user
      await user.update({
        firstName: firstName || user.firstName,
        lastName: lastName || user.lastName,
        phoneNumber: phoneNumber || user.phoneNumber,
        address: address || user.address,
        roleId: roleId || user.roleId,
        dateOfBirth: dateOfBirth || user.dateOfBirth,
        isAvailableForWork: isAvailableForWork,
        abn: abn || user.abn,
        //isActive: isActive || user.isActive
      });

      // Get current alternative names
      const currentAlternativeNames = await user.getAlternateNames();
      const currentNames = currentAlternativeNames.map(name => name.FullName);
      const newNames = alternativeNames || [];

      // Find names to add (in newNames but not in currentNames)
      const namesToAdd = newNames.filter(name => !currentNames.includes(name));
      
      // Find names to remove (in currentNames but not in newNames)
      const namesToRemove = currentAlternativeNames
        .filter(name => !newNames.includes(name.FullName))
        .map(name => name.ID);

      // Perform the necessary operations
      if (namesToRemove.length > 0) {
        console.log(namesToRemove);
        await UserName.destroy({ where: { ID: namesToRemove } });
      }
      
      if (namesToAdd.length > 0) {
        await UserName.bulkCreate(
          namesToAdd.map(name => ({
            UserID: user.id,
            FullName: name
          }))
        );
      }

      // Fetch role name if roleId is provided or already exists
      let roleName = null;
      if (user.roleId) {
        const role = await Role.findByPk(user.roleId);
        if (role) {
          roleName = role.name;
        }
      }

      res.json({
        message: 'Profile updated successfully',
        profile: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          phoneNumber: user.phoneNumber,
          address: user.address,
          dateOfBirth: user.dateOfBirth,
          isActive: user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roleId: user.roleId,
          isAvailableForWork: user.isAvailableForWork,
          roleName: roleName,
          abn: user.abn
        }
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({ message: 'Database error', error: err.message });
    }
});

module.exports = router;