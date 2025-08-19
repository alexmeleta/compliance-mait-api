const express = require('express');
const router = express.Router();
const { Certificate, Jurisdiction, Country, State, File, CertificateFile, LcrType } = require('../models');
const { Op } = require('sequelize');
const { authGuard, ownerGuard, requirePermissions } = require('../middleware/auth');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     # Base schemas
 *     Country:
 *       type: object
 *       properties:
 *         countryCode:
 *           type: string
 *           maxLength: 2
 *           example: "AU"
 *           description: ISO 2-letter country code (primary key)
 *         countryName:
 *           type: string
 *           maxLength: 100
 *           example: "Australia"
 *           description: Full name of the country
 *         phoneCode:
 *           type: string
 *           maxLength: 10
 *           example: "61"
 *           description: International dialing code
 *         addressFormat:
 *           type: string
 *           example: "{street}\n{city} {state} {postalCode}\n{country}"
 *           description: Address formatting template for the country
 *
 *     State:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *           description: Unique identifier for the state
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "New South Wales"
 *           description: Name of the state/province
 *         countryCode:
 *           type: string
 *           maxLength: 2
 *           example: "AU"
 *           description: ISO 2-letter country code this state belongs to
 *
 *     Jurisdiction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *           description: Unique identifier for the jurisdiction
 *         name:
 *           type: string
 *           maxLength: 100
 *           example: "NSW Building Authority"
 *           description: Name of the jurisdiction
 *         country:
 *           $ref: '#/components/schemas/Country'
 *         state:
 *           $ref: '#/components/schemas/State'
 *
 *     File:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *           description: Unique identifier for the file
 *         guid:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *           description: Globally unique identifier for the file
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: "Certificate Document"
 *           description: Display name/title of the file
 *         mimeType:
 *           type: string
 *           maxLength: 255
 *           example: "application/pdf"
 *           description: MIME type of the file
 *         uploadedOn:
 *           type: string
 *           format: date-time
 *           example: "2023-01-15T10:30:00Z"
 *           description: When the file was uploaded
 *
 *     CertificateBase:
 *       type: object
 *       required:
 *         - title
 *       properties:
 *         title:
 *           type: string
 *           maxLength: 255
 *           example: "Professional Engineering License"
 *           description: The certificate title
 *         description:
 *           type: string
 *           nullable: true
 *           example: "State license for professional engineering practice"
 *           description: The certificate description
 *         lcrId:
 *           type: integer
 *           nullable: true
 *           example: 12345
 *           description: The LCR ID associated with the certificate
 *         documentNumber:
 *           type: string
 *           nullable: true
 *           example: "PE-123456"
 *           description: The document number of the certificate
 *         expiryDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2025-12-31"
 *           description: The expiration date of the certificate (YYYY-MM-DD)
 *         issuedDate:
 *           type: string
 *           format: date
 *           nullable: true
 *           example: "2023-01-01"
 *           description: The date the certificate was issued (YYYY-MM-DD)
 *         issuedBy:
 *           type: string
 *           maxLength: 255
 *           nullable: true
 *           example: "State Board of Professional Engineers"
 *           description: The entity that issued the certificate
 *         issuingAuthority:
 *           type: string
 *           maxLength: 255
 *           nullable: true
 *           example: "Department of Professional Regulation"
 *           description: The authority that issued the certificate
 *         jurisdictionId:
 *           type: integer
 *           nullable: true
 *           example: 1
 *           description: The jurisdiction ID associated with the certificate
 *         lcrTypeId:
 *           type: integer
 *           example: 1
 *           description: The LCR Type ID associated with the certificate
 *         renewalFrequency:
 *           type: integer
 *           minimum: 1
 *           nullable: true
 *           example: 12
 *           description: How often the certificate needs to be renewed (in months)
 *
 *     CertificateCreateRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CertificateBase'
 *         - type: object
 *           required:
 *             - fileIds
 *             - lcrTypeId
 *           properties:
 *             fileIds:
 *               type: array
 *               minItems: 1
 *               items:
 *                 type: integer
 *                 example: 1
 *               description: Array of file IDs to associate with this certificate
 *
 *     CertificateUpdateRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CertificateBase'
 *         - type: object
 *           properties:
 *             fileIds:
 *               type: array
 *               items:
 *                 type: integer
 *                 example: [1, 2]
 *               description: Array of file IDs to associate with this certificate (replaces existing files)
 *
 *     CertificateResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/CertificateBase'
 *         - type: object
 *           properties:
 *             id:
 *               type: integer
 *               example: 1
 *               description: The auto-generated id of the certificate
 *             userId:
 *               type: integer
 *               example: 1
 *               description: The user ID who owns the certificate
 *             isDeleted:
 *               type: boolean
 *               example: false
 *               description: Whether the certificate is marked as deleted
 *             files:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/File'
 *               description: Files associated with the certificate
 *             jurisdiction:
 *               $ref: '#/components/schemas/Jurisdiction'
 *             lcrTypeId:
 *               type: integer
 *               example: 1
 *               description: The LCR Type ID associated with the certificate
 *             createdAt:
 *               type: string
 *               format: date-time
 *               example: "2023-01-15T10:30:00Z"
 *               description: Creation timestamp
 *             updatedAt:
 *               type: string
 *               format: date-time
 *               example: "2023-01-15T10:30:00Z"
 *               description: Last update timestamp
 *
 *   tags:
 *     name: Certificates
 *     description: API for managing certificates
 */

/**
 * @swagger
 * /api/certificates:
 *   get:
 *     summary: Get all certificates for the authenticated user
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of certificates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CertificateResponse'
 *       500:
 *         description: Server error
 */
router.get('/', 
  authGuard, 
  async (req, res) => {
  try {
    const userId = req.user.userId;
    const certificates = await Certificate.findAll({
      where: {
        isDeleted: false,
        userId: userId
      },
      include: [
        {
          model: Jurisdiction,
          as: 'jurisdiction',
          attributes: ['id', 'name'],
          include: [
            {
              model: Country,
              as: 'country',
              attributes: ['countryCode', 'countryName']
            },
            {
              model: State,
              as: 'state',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'title', 'guid', 'mimeType'],
          through: {
            attributes: [],
            where: { isDeleted: false }
          }
        }
      ]
    });
    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/certificates/active:
 *   get:
 *     summary: Get active (non-expired) certificates for the authenticated user
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of active certificates
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CertificateResponse'
 *       500:
 *         description: Server error
 */
router.get('/active',
  authGuard,
  async (req, res) => {
  try {
    const userId = req.user.userId;
    const today = new Date().toISOString().split('T')[0];

    const certificates = await Certificate.findAll({
      where: {
        isDeleted: false,
        userId: userId,
        [Op.or]: [
          { expiryDate: null },
          { expiryDate: { [Op.gte]: today } }
        ]
      },
      include: [
        {
          model: Jurisdiction,
          as: 'jurisdiction',
          attributes: ['id', 'name'],
          include: [
            {
              model: Country,
              as: 'country',
              attributes: ['countryCode', 'countryName']
            },
            {
              model: State,
              as: 'state',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'title', 'guid', 'mimeType'],
          through: {
            attributes: [],
            where: { isDeleted: false }
          }
        }
      ]
    });

    res.json(certificates);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/certificates/{id}:
 *   get:
 *     summary: Get a certificate by ID
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.get('/:id', 
  authGuard, 
  async (req, res) => {
  const id = req.params.id;
  try {
    const certificate = await Certificate.findOne({
      where: {
        id: id,
        isDeleted: false,
        userId: req.user.userId
      },
      include: [
        {
          model: Jurisdiction,
          as: 'jurisdiction',
          attributes: ['id', 'name'],
          include: [
            {
              model: Country,
              as: 'country',
              attributes: ['countryCode', 'countryName']
            },
            {
              model: State,
              as: 'state',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'title', 'guid', 'mimeType'],
          through: {
            attributes: [],
            where: { isDeleted: false }
          }
        }
      ]
    });
    
    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }
    
    res.json(certificate);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/certificates:
 *   post:
 *     summary: Create a new certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateCreateRequest'
 *     responses:
 *       201:
 *         description: Certificate created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Bad request - Missing or invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Server error
 */
router.post('/', 
  authGuard, 
  async (req, res) => {
  const { 
    title, 
    description, 
    lcrId, 
    documentNumber, 
    expiryDate, 
    issuedDate, 
    issuedBy, 
    issuingAuthority, 
    jurisdictionId, 
    renewalFrequency,
    lcrTypeId
  } = req.body;

  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  if (lcrTypeId === undefined || lcrTypeId === null) {
    return res.status(400).json({ message: 'lcrTypeId is required' });
  }

  try {
    // Check if jurisdiction exists if jurisdictionId is provided
    if (jurisdictionId) {
      const jurisdiction = await Jurisdiction.findByPk(jurisdictionId);
      if (!jurisdiction) {
        return res.status(404).json({ message: 'Jurisdiction not found' });
      }
    }

    // Check if LcrType exists
    const lcrType = await LcrType.findByPk(lcrTypeId);
    if (!lcrType) {
      return res.status(404).json({ message: 'LCR Type not found' });
    }

    const newCertificate = await Certificate.create({
      title,
      description,
      lcrId,
      documentNumber,
      expiryDate,
      issuedDate,
      issuedBy,
      issuingAuthority,
      jurisdictionId,
      renewalFrequency,
      lcrTypeId,
      isDeleted: false,
      userId: req.user.userId
    });

    // Fetch the created certificate with jurisdiction details
    const certificateWithJurisdiction = await Certificate.findByPk(newCertificate.id, {
      include: [
        {
          model: Jurisdiction,
          as: 'jurisdiction',
          attributes: ['id', 'name'],
          include: [
            {
              model: Country,
              as: 'country',
              attributes: ['countryCode', 'countryName']
            },
            {
              model: State,
              as: 'state',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'title', 'guid', 'mimeType'],
          through: {
            attributes: [],
            where: { isDeleted: false }
          }
        }
      ]
    });

    certificateWithJurisdiction.message = 'Certificate created successfully';

    res.status(201).json(certificateWithJurisdiction);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/certificates/{id}:
 *   put:
 *     summary: Update an existing certificate
 *     tags: [Certificates]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Certificate ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CertificateUpdateRequest'
 *     responses:
 *       200:
 *         description: Certificate updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CertificateResponse'
 *       400:
 *         description: Bad request - Invalid input data
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Forbidden - Not authorized to update this certificate
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { 
    title, 
    description, 
    lcrId, 
    documentNumber, 
    expiryDate, 
    issuedDate, 
    issuedBy, 
    issuingAuthority, 
    jurisdictionId, 
    renewalFrequency,
    lcrTypeId
  } = req.body;

  try {
    const certificate = await Certificate.findOne({
      where: {
        id: id,
        isDeleted: false
      }
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Check if jurisdiction exists if jurisdictionId is provided
    if (jurisdictionId) {
      const jurisdiction = await Jurisdiction.findByPk(jurisdictionId);
      if (!jurisdiction) {
        return res.status(404).json({ message: 'Jurisdiction not found' });
      }
    }

    // Check if LcrType exists if lcrTypeId is provided
    if (lcrTypeId !== undefined) {
      const lcrType = await LcrType.findByPk(lcrTypeId);
      if (!lcrType) {
        return res.status(404).json({ message: 'LCR Type not found' });
      }
    }

    // Update certificate
    await certificate.update({
      title: title || certificate.title,
      description: description !== undefined ? description : certificate.description,
      lcrId: lcrId !== undefined ? lcrId : certificate.lcrId,
      documentNumber: documentNumber !== undefined ? documentNumber : certificate.documentNumber,
      expiryDate: expiryDate !== undefined ? expiryDate : certificate.expiryDate,
      issuedDate: issuedDate !== undefined ? issuedDate : certificate.issuedDate,
      issuedBy: issuedBy !== undefined ? issuedBy : certificate.issuedBy,
      issuingAuthority: issuingAuthority !== undefined ? issuingAuthority : certificate.issuingAuthority,
      jurisdictionId: jurisdictionId !== undefined ? jurisdictionId : certificate.jurisdictionId,
      renewalFrequency: renewalFrequency !== undefined ? renewalFrequency : certificate.renewalFrequency,
      lcrTypeId: lcrTypeId !== undefined ? lcrTypeId : certificate.lcrTypeId
    });

    // Fetch the updated certificate with jurisdiction details
    const updatedCertificate = await Certificate.findByPk(id, {
      include: [
        {
          model: Jurisdiction,
          as: 'jurisdiction',
          attributes: ['id', 'name'],
          include: [
            {
              model: Country,
              as: 'country',
              attributes: ['countryCode', 'countryName']
            },
            {
              model: State,
              as: 'state',
              attributes: ['id', 'name']
            }
          ]
        },
        {
          model: File,
          as: 'files',
          attributes: ['id', 'title', 'guid', 'mimeType'],
          through: {
            attributes: [],
            where: { isDeleted: false }
          }
        }
      ]
    });

    res.json({
      message: 'Certificate updated successfully',
      certificate: updatedCertificate
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/certificates/{id}:
 *   delete:
 *     summary: Soft delete a certificate
 *     tags: [Certificates]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Certificate ID
 *     responses:
 *       200:
 *         description: Certificate deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       404:
 *         description: Certificate not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const certificate = await Certificate.findOne({
      where: {
        id: id,
        isDeleted: false
      }
    });

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Soft delete the certificate
    await certificate.update({ isDeleted: true });

    res.json({ message: 'Certificate deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
