const fs = require('fs');
const path = require('path');
const vision = require('@google-cloud/vision');
const { OpenAI } = require('openai');
const express = require('express');
const multer = require('multer');
const router = express.Router();
const { Certificate } = require('../models');
const crypto = require('crypto');
const { authGuard } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

/**
 * @swagger
 * components:
 *   schemas:
 *     DocumentInfo:
 *       type: object
 *       properties:
 *         document_id:
 *           type: string
 *           description: Extracted document ID or reference number
 *           example: "DOC-12345"
 *         title:
 *           type: string
 *           description: Title of the document
 *           example: "Professional Engineer License"
 *         description:
 *           type: string
 *           description: Description of the document
 *           example: "License to practice professional engineering"
 *         issued_to:
 *           type: string
 *           description: Name of the person or entity the document is issued to
 *           example: "John Doe"
 *         issuing_authority:
 *           type: string
 *           description: Organization that issued the document
 *           example: "State Board of Professional Engineers"
 *         issued_date:
 *           type: string
 *           format: date
 *           description: Date when the document was issued (YYYY-MM-DD)
 *           example: "2023-01-15"
 *         expiry_date:
 *           type: string
 *           format: date
 *           nullable: true
 *           description: Date when the document expires (YYYY-MM-DD), if applicable
 *           example: "2025-12-31"
 *         renewal_frequency:
 *           type: string
 *           description: How often the document needs to be renewed
 *           example: "2 years"
 *
 *     ScanRequest:
 *       type: object
 *       required:
 *         - file
 *       properties:
 *         file:
 *           type: string
 *           format: binary
 *           description: The document file to scan (PDF or image)
 *
 *     ScanResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/DocumentInfo'
 *         - type: object
 *           properties:
 *             guid:
 *               type: string
 *               format: uuid
 *               description: Unique identifier for the scanned document
 *               example: "123e4567-e89b-12d3-a456-426614174000"
 *
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Human-readable error message
 *           example: "Error processing document"
 *         error:
 *           type: string
 *           description: Detailed error information
 *           example: "No text could be extracted from the document"
 *
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * tags:
 *   name: Scan
 *   description: API for scanning and processing document images to extract certificate information
 */

/**
 * @swagger
 * /api/scan:
 *   post:
 *     summary: Scan and extract information from a document
 *     description: Upload a document (PDF or image) to extract certificate information using OCR and AI processing
 *     tags: [Scan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ScanRequest'
 *     responses:
 *       200:
 *         description: Successfully processed document and extracted information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ScanResponse'
 *       400:
 *         description: Bad request - invalid or missing file
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized - authentication required
 *       413:
 *         description: Request entity too large - file size exceeds limit
 *       500:
 *         description: Server error during document processing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/scan', 
  authGuard,
  upload.single('file'), 
  async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        message: 'No file uploaded',
        error: 'File is required' 
      });
    }

    // Process the uploaded file using analyzeDocument
    const filePath = req.file.path;
    const extractedText = await analyzeDocument(filePath);
    
    if (!extractedText) {
      return res.status(400).json({ 
        message: 'No text could be extracted from the document',
        error: 'OCR processing failed' 
      });
    }

    // Extract structured information from the text
    const documentInfo = await extractDocumentInfo(extractedText);

    // Generate a UUID for the certificate
    const guid = crypto.randomUUID();

    // Convert the extracted info into a Certificate model format
    const certificate = {
      guid: guid,
      title: documentInfo.title || 'Untitled Certificate',
      description: documentInfo.description || '',
      lcrId: documentInfo.document_id || '',
      expiryDate: documentInfo.expiry_date ? new Date(documentInfo.expiry_date) : null,
      issuedDate: documentInfo.issued_date ? new Date(documentInfo.issued_date) : new Date(),
      issuedBy: documentInfo.issued_to || '',
      issuingAuthority: documentInfo.issuing_authority || '',
      renewalFrequency: documentInfo.renewal_frequency || '',
      // Note: This is just a preview, not saved to database yet
      // The actual saving would require userId and jurisdictionId
    };

    // Clean up the temporary file
    fs.unlinkSync(filePath);

    res.json({
      ...documentInfo,
      guid: guid
    });
  } catch (error) {
    console.error('Error processing document:', error);
    
    // Clean up temp file if it exists
    if (req.file?.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      message: 'Error processing document', 
      error: error.message 
    });
  }
});

// Load OpenAI API key
function getOpenAIApiKey() {
  let apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    // Try to load from sk-svcacct.txt in the current directory
    const keyPath = path.join(__dirname, 'sk-svcacct.txt');
    if (fs.existsSync(keyPath)) {
      apiKey = fs.readFileSync(keyPath, 'utf8').trim();
    } else {
      throw new Error('OpenAI API key not found');
    }
  }

  console.log('Using OpenAI API key:', apiKey);

  return apiKey;
}

// Initialize clients
const visionClient = new vision.ImageAnnotatorClient({
  key: process.env.GOOGLE_VISION_API_KEY
});
const openai = new OpenAI({ apiKey: getOpenAIApiKey() });

// Extract text from document using Google Vision API
async function analyzeDocument(imagePath) {
  const imageBuffer = fs.readFileSync(imagePath);
  const [result] = await visionClient.textDetection({ image: { content: imageBuffer } });

  if (result.error && result.error.message) {
    throw new Error(`${result.error.message}\nSee: https://cloud.google.com/apis/design/errors`);
  }

  const annotations = result.textAnnotations;
  if (!annotations || annotations.length === 0) return '';

  return annotations[0].description || '';
}

// Use OpenAI to extract structured info from the text
async function extractDocumentInfo(text) {
  const systemPrompt =
    `You are a helpful assistant that extracts specific fields from certificate text. ` +
    `Please extract the following fields if they exist:\n` +
    `1) Document ID\n2) Title\n3) Description\n4) To whom it's issued (Issued To)\n` +
    `5) Issuing Authority\n6) Issued Date\n7) Expiry Date\n8) Renewal Frequency\n\n` +
    `Return your answer as valid JSON with these keys:\n` +
    `document_id, title, description, issued_to, issuing_authority, ` +
    `issued_date, expiry_date, renewal_frequency.\n` +
    `If a field is not found, return its value as null.`;

  const userPrompt = `Here is the certificate text:\n\n${text}\n\n`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
    });

    let content = response.choices[0].message.content || '';
    content = content.replace('```json', '').replace('```', '').trim();

    return JSON.parse(content);
  } catch (e) {
    console.error(`Error calling OpenAI API: ${e}`);
    return {
      document_id: 'Error processing',
      title: 'Error processing',
      description: 'Error processing',
      issued_to: 'Error processing',
      issuing_authority: 'Error processing',
      issued_date: 'Error processing',
      expiry_date: 'Error processing',
      renewal_frequency: 'Error processing',
    };
  }
}

// Export as a module
module.exports = {
  analyzeDocument,
  extractDocumentInfo, 
  router
};
