const express = require('express');
const router = express.Router();
const { File, Certificate, CertificateFile } = require('../models');
const { authGuard } = require('../middleware/auth');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

// Configure multer for file uploads (store in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware to parse JSON bodies
router.use(express.json());

const sendPlaceholder = (res) => {
  const placeholderSvg = `
    <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
      <rect width="200" height="200" style="fill: #cccccc;" />
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16px" fill="#666666">No Image</text>
    </svg>
  `;
  res.set('Content-Type', 'image/svg+xml');
  res.send(placeholderSvg);
};

/**
 * @swagger
 * components:
 *   schemas:
 *     FileBase:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: "Document.pdf"
 *           description: The file title/name
 *         type:
 *           type: integer
 *           example: 1
 *           description: The file type identifier
 *         mimeType:
 *           type: string
 *           example: "application/pdf"
 *           description: The MIME type of the file
 *         accuracy:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           nullable: true
 *           example: 95
 *           description: The accuracy score of the file (0-100)
 *
 *     FileCreateRequest:
 *       type: object
 *       required:
 *         - file
 *       properties:
 *         file:
 *           type: string
 *           format: binary
 *           description: The file to upload (binary data)
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: "Document.pdf"
 *           description: Custom title for the file (defaults to original filename)
 *         type:
 *           type: integer
 *           example: 1
 *           description: The file type identifier
 *         certificateId:
 *           type: integer
 *           example: 1
 *           description: Optional certificate ID to associate this file with
 *
 *     FileResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/FileBase'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *               description: The auto-generated ID of the file
 *             guid:
 *               type: string
 *               format: uuid
 *               example: "550e8400-e29b-41d4-a716-446655440000"
 *               description: The unique identifier for the file
 *             ownerId:
 *               type: integer
 *               example: 1
 *               description: The ID of the user who owns the file
 *             uploadedOn:
 *               type: string
 *               format: date-time
 *               example: "2023-01-01T10:00:00.000Z"
 *               description: The date and time when the file was uploaded
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Error message describing the issue"
 *         error:
 *           type: string
 *           example: "Detailed error information"
 *
 *   responses:
 *     UnauthorizedError:
 *       description: Unauthorized
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * tags:
 *   name: Files
 *   description: API for managing file uploads and downloads
 */

/**
 * @swagger
 * /api/files/{id}:
 *   get:
 *     summary: Get file binary content by ID
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: File ID
 *     responses:
 *       200:
 *         description: File binary content
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *         headers:
 *           Content-Type:
 *             schema:
 *               type: string
 *             description: The MIME type of the file
 *           Content-Disposition:
 *             schema:
 *               type: string
 *             description: Attachment header with filename
 *       400:
 *         description: Bad request - Invalid file ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User doesn't have permission to access this file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found or content not available
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/:id', 
  authGuard, 
  async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.userId;
    
    try {
      // Find the file and verify ownership
      const file = await File.findOne({
        where: {
          id: fileId,
          ownerId: userId
        }
      });
      
      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Check if file has content
      if (!file.content) {
        return res.status(404).json({ message: 'File content not available' });
      }
      
      // Set appropriate headers
      const mimeType = file.mimeType || 'application/octet-stream';
      const filename = file.title || `file_${file.id}`;
      
      res.set({
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': file.content.length
      });
      
      // Send the binary content
      res.send(file.content);
      
    } catch (err) {
      console.error('Error retrieving file:', err);
      res.status(500).json({ message: 'Database error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/files:
 *   post:
 *     summary: Upload a new file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/FileCreateRequest'
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FileResponse'
 *       400:
 *         description: Bad request - Invalid file or missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - Authentication required
 *       404:
 *         description: Certificate not found (if certificateId is provided)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       413:
 *         description: Payload too large - File exceeds maximum allowed size (10MB)
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/',
  authGuard,
  upload.single('file'),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file provided' });
      }

      const userId = req.user.userId;
      const { title, type, certificateId } = req.body;

      // Remove all previous files for the user
      await deleteAllFiles(userId);

      // Create file record
      const newFile = await File.create({
        guid: uuidv4(),
        title: title || req.file.originalname,
        type: type ? parseInt(type) : null,
        ownerId: userId,
        uploadedOn: new Date(),
        content: req.file.buffer,
        mimeType: req.file.mimetype,
        accuracy: null
      });

      // If certificateId is provided, link the file to the certificate
      if (certificateId) {
        const certificate = await Certificate.findOne({
          where: {
            id: certificateId,
            userId: userId,
            isDeleted: false
          }
        });

        if (!certificate) {
          return res.status(404).json({ message: 'Certificate not found or you do not have permission to access it.' });
        }

        let certificateFile = await CertificateFile.create({
          certificateId: certificate.id,
          fileId: newFile.id,
          isDeleted: false
        });
      }
      else {
        return res.status(404).json({ message: 'CertificatId not provided.' });
      }

      // Return file info (without binary content)
      const fileResponse = {
        id: newFile.id,
        guid: newFile.guid,
        title: newFile.title,
        type: newFile.type,
        ownerId: newFile.ownerId,
        uploadedOn: newFile.uploadedOn,
        mimeType: newFile.mimeType,
        accuracy: newFile.accuracy
      };

      res.status(201).json({
        message: 'File uploaded successfully',
        file: fileResponse
      });

    } catch (err) {
      console.error('Error uploading file:', err);
      res.status(500).json({ message: 'Database error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/files/thumbnail/{id}:
 *   get:
 *     summary: Get a thumbnail for an image file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: File ID
 *     responses:
 *       200:
 *         description: Thumbnail image or placeholder
 *         content:
 *           image/jpeg:
 *             schema:
 *               type: string
 *               format: binary
 *           image/png:
 *             schema:
 *               type: string
 *               format: binary
 *           image/svg+xml:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - Invalid file ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User doesn't have permission to access this file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/thumbnail/:id', 
  authGuard, 
  async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.userId;

    try {
      const file = await File.findOne({
        where: {
          id: fileId,
          ownerId: userId
        },
        attributes: ['content', 'mimeType'] // Only fetch necessary fields
      });

      if (!file || !file.content) {
        return sendPlaceholder(res);
      }

      if (!file.mimeType || !file.mimeType.startsWith('image/')) {
        return sendPlaceholder(res);
      }

      sharp(file.content)
        .resize({ width: 200 })
        .jpeg({ quality: 80 })
        .toBuffer((err, buffer, info) => {
          if (err) {
            console.error('Error processing thumbnail:', err);
            return sendPlaceholder(res);
          }
          res.set('Content-Type', 'image/jpeg');
          res.send(buffer);
        });

    } catch (err) {
      console.error('Error retrieving thumbnail:', err);
      sendPlaceholder(res); // Graceful degradation on any error
    }
  }
);

/**
 * @swagger
 * /api/files/{id}:
 *   delete:
 *     summary: Delete a file
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: File ID to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "File deleted successfully"
 *       400:
 *         description: Bad request - Invalid file ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Forbidden - User doesn't have permission to delete this file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: File not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.delete('/:id',
  authGuard,
  async (req, res) => {
    const fileId = req.params.id;
    const userId = req.user.userId;

    try {
      // Find the file and verify ownership
      const file = await File.findOne({
        where: {
          id: fileId,
          ownerId: userId
        }
      });

      if (!file) {
        return res.status(404).json({ message: 'File not found' });
      }

      // Delete associated CertificateFile records first
      await CertificateFile.destroy({
        where: {
          fileId: fileId
        }
      });

      // Now, delete the file
      await file.destroy();

      res.json({ message: 'File deleted successfully' });

    } catch (err) {
      console.error('Error deleting file:', err);
      res.status(500).json({ message: 'Database error', error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/files:
 *   delete:
 *     summary: Delete all files for the authenticated user
 *     tags: [Files]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All files deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "All files deleted successfully"
 *                 count:
 *                   type: integer
 *                   example: 5
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
// Current implementation in router.delete:
router.delete('/',
  authGuard,
  async (req, res) => {
    const userId = req.user.userId;
    await deleteAllFiles(userId);
  }
);

// Should be changed to:
router.delete('/',
  authGuard,
  async (req, res) => {
    const userId = req.user.userId;
    try {
      const result = await deleteAllFiles(userId);
      
      if (result.count === 0) {
        return res.status(200).json({ 
          message: 'No files found to delete',
          count: 0
        });
      }
      
      res.json({ 
        message: 'All files deleted successfully',
        count: result.count
      });
    } catch (err) {
      console.error('Error deleting files:', err);
      res.status(500).json({ 
        message: 'Error deleting files', 
        error: err.message 
      });
    }
  }
);

// Should be changed to:
async function deleteAllFiles(userId) {
  // First, find all files for the user
  const files = await File.findAll({
    where: {
      ownerId: userId
    }
  });

  if (!files || files.length === 0) {
    return { count: 0 };
  }

  // Get all file IDs for batch deletion of CertificateFile records
  const fileIds = files.map(file => file.id);

  // Delete all associated CertificateFile records in a single operation
  await CertificateFile.destroy({
    where: {
      fileId: fileIds
    }
  });

  // Delete all user's files in a single operation
  const deletedCount = await File.destroy({
    where: {
      ownerId: userId
    }
  });

  return { count: deletedCount };
}

module.exports = router;
