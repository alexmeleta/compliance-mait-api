const express = require('express');
const router = express.Router();
const { User, UserAvatar } = require('../models');
const { authGuard, ownerGuard } = require('../middleware/auth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Configure multer for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * @swagger
 * components:
 *   schemas:
 *     Avatar:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The avatar ID
 *         guid:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the avatar
 *         mimeType:
 *           type: string
 *           description: The MIME type of the avatar image
 *         createdOn:
 *           type: string
 *           format: date-time
 *           description: When the avatar was created
 */

/**
 * @swagger
 * /api/profiles/me/avatar:
 *   get:
 *     summary: Get the current user's avatar
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: The user's avatar
 *         content:
 *           image/*:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: No avatar found for user
 *       500:
 *         description: Server error
 */
router.get('/me/avatar', authGuard, async (req, res) => {
  try {
    if (!req.user.userId) {
      return res.status(400).json({ message: 'No user found' });
    }
    
    const avatar = await UserAvatar.findOne({
      where: { userId: req.user.userId },
      attributes: ['content', 'mimeType']
    });

    if (!avatar) {
      return res.status(404).json({ message: 'Avatar not found' });
    }

    res.set('Content-Type', avatar.mimeType);
    res.send(avatar.content);
  } catch (error) {
    console.error('Error fetching avatar:', error);
    res.status(500).json({ message: 'Error fetching avatar', error: error.message });
  }
});

/**
 * @swagger
 * /api/profiles/me/avatar:
 *   post:
 *     summary: Upload or update the current user's avatar
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *                 description: The avatar image file (max 5MB)
 *     responses:
 *       200:
 *         description: Avatar uploaded/updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Avatar'
 *       400:
 *         description: Invalid file type or no file provided
 *       500:
 *         description: Server error
 */
router.post('/me/avatar', 
  authGuard, 
  upload.single('avatar'), 
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }
      if (!req.user.userId) {
        return res.status(400).json({ message: 'No user found' });
      }

      // Remove all previous avatars
      await UserAvatar.destroy({
        where: { userId: req.user.userId }
      });

      const [avatar] = await UserAvatar.upsert(
        {
          userId: req.user.userId,
          content: req.file.buffer,
          mimeType: req.file.mimetype
        },
        {
          returning: true,
          where: { userId: req.user.userId }
        }
      );

      res.json({
        id: avatar.id,
        guid: avatar.guid,
        mimeType: avatar.mimeType,
        createdOn: avatar.createdOn
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      res.status(500).json({ message: 'Error uploading avatar', error: error.message });
    }
  }
);

/**
 * @swagger
 * /api/profiles/me/avatar:
 *   delete:
 *     summary: Delete the current user's avatar
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       204:
 *         description: Avatar deleted successfully
 *       404:
 *         description: No avatar found for user
 *       500:
 *         description: Server error
 */
router.delete('/me/avatar', authGuard, async (req, res) => {
  try {
    const result = await UserAvatar.destroy({
      where: { userId: req.user.userId }
    });

    if (result === 0) {
      return res.status(404).json({ message: 'No avatar found' });
    }

    res.status(204).end();
  } catch (error) {
    console.error('Error deleting avatar:', error);
    res.status(500).json({ message: 'Error deleting avatar', error: error.message });
  }
});

module.exports = router;
