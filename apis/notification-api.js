const express = require('express');
const router = express.Router();
const { Notification, User, Role, NotificationType } = require('../models');
const { Op } = require('sequelize');
const { authGuard, ownerGuard, requirePermissions } = require('../middleware/auth');
const notificationsService = require('../services/NotificationsService');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     # Base schemas
 *     NotificationType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The notification type ID
 *         name:
 *           type: string
 *           description: The name of the notification type
 *
 *     UserReference:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The user ID
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
 *         role:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The role ID
 *             name:
 *               type: string
 *               description: The role name
 *
 *     NotificationBase:
 *       type: object
 *       required:
 *         - typeId
 *         - senderId
 *         - message
 *       properties:
 *         typeId:
 *           type: integer
 *           description: The notification type ID
 *         recipientId:
 *           type: integer
 *           nullable: true
 *           description: The user ID of the recipient (null for system notifications)
 *         senderId:
 *           type: integer
 *           description: The user ID of the sender
 *         message:
 *           type: string
 *           description: The notification message
 *         title:
 *           type: string
 *           description: The notification title
 *
 *     NotificationResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/NotificationBase'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The notification ID
 *             guid:
 *               type: string
 *               format: uuid
 *               description: The unique identifier for the notification
 *             isReceived:
 *               type: boolean
 *               description: Whether the notification has been received
 *             isRead:
 *               type: boolean
 *               description: Whether the notification has been read
 *             createdAt:
 *               type: string
 *               format: date-time
 *               description: The date the notification was created
 *             type:
 *               $ref: '#/components/schemas/NotificationType'
 *             sender:
 *               $ref: '#/components/schemas/UserReference'
 *             recipient:
 *               $ref: '#/components/schemas/UserReference'
 *
 *     NotificationCreateRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/NotificationBase'
 *         - type: object
 *           required:
 *             - title
 *           properties:
 *             title:
 *               type: string
 *               description: The notification title
 *
 *     NotificationUpdateRequest:
 *       type: object
 *       properties:
 *         isRead:
 *           type: boolean
 *           description: Whether the notification has been read
 *         isReceived:
 *           type: boolean
 *           description: Whether the notification has been received
 */

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: API for managing notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     summary: Get all notifications for the authenticated user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Server error
 */
router.get('/', 
  authGuard, 
  async (req, res) => {
  try {
    const userId = req.user.userId;
    const notifications = await notificationsService.getNotificationsForUser(userId);
    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   get:
 *     summary: Get a notification by ID
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.get('/:id', 
  authGuard, 
  async (req, res) => {
  const id = req.params.id;
  try {
    const notification = await notificationsService.getNotificationById(id, req.user.userId);
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    
    res.json(notification);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/user/{userId}:
 *   get:
 *     summary: Get notifications for a specific user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Server error
 */
router.get('/user/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const notifications = await notificationsService.getNotificationsForUser(userId);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/unread/{userId}:
 *   get:
 *     summary: Get unread notifications for a specific user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: List of unread notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/NotificationResponse'
 *       500:
 *         description: Server error
 */
router.get('/unread/:userId', async (req, res) => {
  const userId = req.params.userId;
  try {
    const notifications = await notificationsService.getNotificationsForUser(userId, true);
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications:
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationCreateRequest'
 *     responses:
 *       201:
 *         description: Notification created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const { 
    typeId, 
    recipientId, 
    senderId, 
    message,
    title
  } = req.body;

  if (!typeId || !senderId || !message) {
    return res.status(400).json({ message: 'Type ID, Sender ID, and Message are required' });
  }

  try {
    const notification = await notificationsService.createNotification({
      typeId,
      recipientId,
      senderId,
      message,
      title
    });

    res.status(201).json({
      message: 'Notification created successfully',
      notification
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
 * /api/notifications/{id}:
 *   put:
 *     summary: Update a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationUpdateRequest'
 *     responses:
 *       200:
 *         description: Notification updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       400:
 *         description: Bad request - Invalid input
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;

  try {
    const updatedNotification = await notificationsService.updateNotification(id, updateData);
    
    res.json({
      message: 'Notification updated successfully',
      notification: updatedNotification
    });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationResponse'
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/read', async (req, res) => {
  const id = req.params.id;
  
  try {
    const notification = await notificationsService.markAsRead(id);
    
    res.json({
      message: 'Notification marked as read',
      notification
    });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}/all-read:
 *   patch:
 *     summary: Mark all notifications as read for a user
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: User ID
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.patch('/:id/all-read', async (req, res) => {
  const userId = req.params.id;
  
  try {
    const updatedCount = await notificationsService.markAllAsRead(userId);
    
    res.json({
      message: `${updatedCount} notifications marked as read`
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Notification not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    await notificationsService.deleteNotification(id);
    
    res.json({
      message: 'Notification deleted successfully'
    });
  } catch (err) {
    if (err.message === 'Notification not found') {
      return res.status(404).json({ message: err.message });
    }
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
