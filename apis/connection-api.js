const express = require('express');
const router = express.Router();
const { Connection, User, Role } = require('../models');
const { Op } = require('sequelize');
const { authGuard, ownerGuard, requirePermissions } = require('../middleware/auth');
const connectionsService = require('../services/ConnectionsService');

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
 *
 *     ConnectionBase:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The connection ID
 *         guid:
 *           type: string
 *           format: uuid
 *           description: Globally unique identifier for the connection
 *         status:
 *           type: integer
 *           description: Status of the connection (0=pending, 1=accepted, 2=rejected, 3=revoked)
 *         isLcrAvailable:
 *           type: boolean
 *           description: Whether LCR is available for this connection
 *         autoSubmitAccuracyPercent:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           description: Accuracy percentage for auto-submission
 *         sentOn:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the connection was sent
 *         note:
 *           type: string
 *           nullable: true
 *           description: Optional note about the connection
 *
 *     ConnectionResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/ConnectionBase'
 *         - type: object
 *           properties:
 *             sender:
 *               $ref: '#/components/schemas/UserResponse'
 *             recipient:
 *               $ref: '#/components/schemas/UserResponse'
 *             invite:
 *               $ref: '#/components/schemas/InviteResponse'
 *
 *     InviteResponse:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The ID of the invite
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
 *
 *     ConnectionCreateRequest:
 *       type: object
 *       required:
 *         - recipientId
 *       properties:
 *         recipientId:
 *           type: integer
 *           description: ID of the recipient user
 *         status:
 *           type: integer
 *           default: 0
 *           description: Status of the connection (default 0=pending)
 *         isLcrAvailable:
 *           type: boolean
 *           default: false
 *           description: Whether LCR is available (default false)
 *         autoSubmitAccuracyPercent:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           nullable: true
 *           description: Accuracy percentage for auto-submission
 *         note:
 *           type: string
 *           nullable: true
 *           description: Optional note about the connection
 *
 *     ConnectionUpdateRequest:
 *       type: object
 *       properties:
 *         status:
 *           type: integer
 *           description: New status of the connection
 *         isLcrAvailable:
 *           type: boolean
 *           description: Whether LCR is available
 *         autoSubmitAccuracyPercent:
 *           type: number
 *           format: float
 *           minimum: 0
 *           maximum: 100
 *           nullable: true
 *           description: Accuracy percentage for auto-submission
 *         note:
 *           type: string
 *           nullable: true
 *           description: Optional note about the connection
 */

/**
 * @swagger
 * tags:
 *   name: Connections
 *   description: API for managing connections between users
 */

/**
 * @swagger
 * /api/connections:
 *   get:
 *     summary: Get all connections
 *     tags: [Connections]
 *     responses:
 *       200:
 *         description: List of connections
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConnectionResponse'
 *       500:
 *         description: Server error
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const userId = req.user.userId;
    const connections = await connectionsService.getConnectionsForUser(userId);
    res.json(connections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/connections/{id}:
 *   get:
 *     summary: Get connection by ID
 *     tags: [Connections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the connection to retrieve
 *     responses:
 *       200:
 *         description: Connection details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConnectionResponse'
 *       404:
 *         description: Connection not found
 *       500:
 *         description: Server error
 */
router.get('/:id', authGuard, async (req, res) => {
  const id = req.params.id;
  try {
    const connection = await connectionsService.getConnectionById(id, req.user.userId);
    
    if (!connection) {
      return res.status(400).json({ message: 'Connection not found' });
    }
    
    res.json(connection);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/connections/user/{userId}:
 *   get:
 *     summary: Get connections for a specific user (as sender or recipient)
 *     tags: [Connections]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the user to retrieve connections for
 *     responses:
 *       200:
 *         description: List of connections for the specified user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/ConnectionResponse'
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', authGuard, async (req, res) => {
  const userId = req.params.userId;
  try {
    const connections = await connectionsService.getAllConnectionsForUser(userId);
    res.json(connections);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/connections:
 *   post:
 *     summary: Create a new connection
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectionCreateRequest'
 *     responses:
 *       201:
 *         description: Connection created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connection created successfully
 *                 connection:
 *                   $ref: '#/components/schemas/ConnectionResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: Sender or recipient not found
 *       500:
 *         description: Server error
 */
router.post('/', authGuard, async (req, res) => {
  const { 
    recipientId, 
    status, 
    isLcrAvailable, 
    autoSubmitAccuracyPercent, 
    note 
  } = req.body;
  const userId = req.user.userId;

  if (!recipientId) {
    return res.status(400).json({ message: 'Recipient ID is required' });
  }

  try {
    const connection = await connectionsService.createConnection({
      recipientId,
      senderId: userId,
      status,
      isLcrAvailable,
      autoSubmitAccuracyPercent,
      note
    });

    res.status(201).json({
      message: 'Connection created successfully',
      connection
    });
  } catch (err) {
    if (err.message === 'Sender not found' || err.message === 'Recipient not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/connections/{id}:
 *   put:
 *     summary: Update a connection
 *     tags: [Connections]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the connection to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ConnectionUpdateRequest'
 *     responses:
 *       200:
 *         description: Connection updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connection updated successfully
 *                 connection:
 *                   $ref: '#/components/schemas/ConnectionResponse'
 *       404:
 *         description: Connection not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  try {
    const updatedConnection = await connectionsService.updateConnection(id, updateData);
    
    res.json({
      message: 'Connection updated successfully',
      connection: updatedConnection
    });
  } catch (err) {
    if (err.message === 'Connection not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/connections/{id}:
 *   delete:
 *     summary: Delete a connection
 *     tags: [Connections]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the connection to delete
 *     responses:
 *       200:
 *         description: Connection deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Connection deleted successfully
 *       404:
 *         description: Connection not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    await connectionsService.deleteConnection(id);
    
    res.json({ message: 'Connection deleted successfully' });
  } catch (err) {
    if (err.message === 'Connection not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
