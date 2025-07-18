const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { Invite, User, Connection } = require('../models');
const { authGuard, ownerGuard, requirePermissions } = require('../middleware/auth');
const bcrypt = require('bcrypt');
const { sequelize } = require('../config/database');
const { sendInvitationEmail } = require('../services/emailService');
const manageUsers = require('../services/UserService');
const invitesService = require('../services/InvitesService');
const notificationsService = require('../services/NotificationsService');
const { Op } = require('sequelize');

/**
 * @swagger
 * tags:
 *   name: Invites
 *   description: Invite management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Invite:
 *       type: object
 *       required:
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated ID of the invite
 *         guid:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the invite
 *         email:
 *           type: string
 *           format: email
 *           description: The email address of the invitee
 *         senderId:
 *           type: integer
 *           description: ID of the user who sent the invite
 *         sendOn:
 *           type: string
 *           format: date-time
 *           description: When the invite was sent
 *         isActive:
 *           type: boolean
 *           description: Whether the invite is still active
 *         isDeleted:
 *           type: boolean
 *           description: Whether the invite is soft-deleted
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the invite was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the invite was last updated
 *       example:
 *         id: 1
 *         guid: '550e8400-e29b-41d4-a716-446655440000'
 *         email: 'user@example.com'
 *         senderId: 1
 *         sendOn: '2023-01-01T00:00:00.000Z'
 *         isActive: true
 *         isDeleted: false
 *         createdAt: '2023-01-01T00:00:00.000Z'
 *         updatedAt: '2023-01-01T00:00:00.000Z'
 */

/**
 * @swagger
 * /api/invites:
 *   post:
 *     summary: Create a new invite
 *     tags: [Invites]
 *     security:
 *       - bearerAuth: []
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
 *                 description: Email address to send the invite to
 *     responses:
 *       201:
 *         description: Invite created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Invite'
 *       400:
 *         description: Validation error or user already invited
 *       500:
 *         description: Server error
 */
router.post(
  '/',
  authGuard,
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    var { email } = req.body;
    const senderId = req.user.userId;
    var recipientId = null;
    var connection = null;

    try {
      email = decodeURIComponent(email.toLowerCase());
      const user = await User.findOne({
        where: { 
          email,
          isDeleted: false
        }
      });

      recipientId = user?.id ?? null;
      if (senderId === recipientId) {
        throw new Error('Useres cannot invite themselves.');
      }

      console.log(`Console log user: ${JSON.stringify(user)}`);
      console.log(`Console log senderId: ${senderId}`);
      console.log(`Console log recipientId: ${recipientId}`);

      connection = await Connection.findOne({
        where: {
          [Op.and]: [
            { senderId: senderId },
            { recipientId: recipientId }
          ]
        },
      });

      if (!connection) {
        // Check if connection exists
        connection = await Connection.create({
          senderId,
          recipientId,
          status: 2,
          isLcrAvailable: false,
          autoSubmitAccuracyPercent: 0,
          note: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      var inviteData;

      if (!user) {
        inviteData = await invitesService.createInvite({
          email,
          senderId,
          isActive: true,
          isDeleted: false,
          connectionId: connection.id,
        });

        try {
          // Send invitation email
          await sendInvitationEmail(email, inviteData.guid);
        } catch (emailError) {
          console.error('Failed to send invitation email:', emailError);
          // Continue even if email fails, but log the error
        }
      }

      try {
        await notificationsService.createNotification({
          recipientId: senderId,
          senderId: senderId,
          typeId: 1,
          message: `You have invited ${email}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      } catch (err) {
        console.error('Error creating notification:', err);
      }
      
      res.status(201).json({
        success: true,
        message: 'Invite sent successfully',
        data: inviteData
      });
    } catch (err) {
      console.error('Error creating invite:', err);
      
      if (err.message === 'User with this email already exists') {
        return res.status(400).json({
          success: false,
          message: err.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

/**
 * @swagger
 * /api/invites/{guid}:
 *   get:
 *     summary: Get invite by GUID
 *     tags: [Invites]
 *     security: []
 *     parameters:
 *       - in: path
 *         name: guid
 *         schema:
 *           type: string
 *           format: uuid
 *         required: true
 *         description: Invite GUID
 *     responses:
 *       200:
 *         description: Invite details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Invite'
 *       404:
 *         description: Invite not found or inactive
 *       500:
 *         description: Server error
 */
router.get('/:guid', async (req, res) => {
  try {
    const { guid } = req.params;
    const invite = await invitesService.getInviteByGuid(guid);

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: 'Invite not found or has expired',
      });
    }

    res.json({
      success: true,
      data: invite,
    });
  } catch (err) {
    console.error('Error getting invite:', err);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

/**
 * @swagger
 * /api/invites/accept:
 *   post:
 *     summary: Accept an invite and create a new user
 *     tags: [Invites]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - guid
 *               - email
 *               - firstName
 *               - lastName
 *               - dob
 *               - phone
 *               - address
 *               - password
 *             properties:
 *               guid:
 *                 type: string
 *                 format: uuid
 *                 description: The invite GUID
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address
 *               firstName:
 *                 type: string
 *                 description: First name
 *               lastName:
 *                 type: string
 *                 description: Last name
 *               dob:
 *                 type: string
 *                 format: date
 *                 description: Date of birth
 *               phone:
 *                 type: string
 *                 description: Phone number
 *               address:
 *                 type: string
 *                 description: Address
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Password for the new user
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: integer
 *       400:
 *         description: Validation error or invite not found
 *       500:
 *         description: Server error
 */
router.post(
  '/accept',
  [
    check('guid', 'Valid invite GUID is required').isUUID(),
    check('email', 'Please include a valid email').isEmail(),
    check('firstName', 'First name is required').notEmpty(),
    check('lastName', 'Last name is required').notEmpty(),
    check('password', 'Please enter a password with 8 or more characters').isLength({ min: 8 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      guid, 
      email, 
      firstName, 
      lastName, 
      dob, 
      phone, 
      address, 
      password 
    } = req.body;

    try {
      const result = await invitesService.acceptInvite({
        guid,
        email,
        firstName,
        lastName,
        password,
        dob,
        phone,
        address
      });

      res.status(201).json({
        success: true,
        message: 'User created successfully',
        data: {
          userId: result.userId
        }
      });
    } catch (err) {
      console.error('Error accepting invite:', err);
      
      if (err.message === 'Invalid or expired invite' || err.message === 'User with this email already exists') {
        return res.status(400).json({
          success: false,
          message: err.message,
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
      });
    }
  }
);

module.exports = router;
