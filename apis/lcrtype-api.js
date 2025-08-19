const express = require('express');
const router = express.Router();
const { LcrType } = require('../models');

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * components:
 *   schemas:
 *     LcrType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the LCR Type
 *         name:
 *           type: string
 *           description: The name of the LCR Type
 *       example:
 *         id: 1
 *         name: "License"
 */

/**
 * @swagger
 * tags:
 *   name: LcrTypes
 *   description: API for managing LCR Types
 */

/**
 * @swagger
 * /api/lcrtypes:
 *   get:
 *     summary: Get all LCR Types
 *     tags: [LcrTypes]
 *     responses:
 *       200:
 *         description: List of LCR Types
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LcrType'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const types = await LcrType.findAll({ order: [['name', 'ASC']] });
    res.json(types);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/lcrtypes/{id}:
 *   get:
 *     summary: Get LCR Type by ID
 *     tags: [LcrTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the LCR Type to retrieve
 *     responses:
 *       200:
 *         description: LCR Type details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LcrType'
 *       404:
 *         description: LCR Type not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const type = await LcrType.findByPk(id);
    if (!type) {
      return res.status(404).json({ message: 'LCR Type not found' });
    }
    res.json(type);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/lcrtypes:
 *   post:
 *     summary: Create a new LCR Type
 *     tags: [LcrTypes]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the LCR Type
 *     responses:
 *       201:
 *         description: LCR Type created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: LCR Type created successfully
 *                 type:
 *                   $ref: '#/components/schemas/LcrType'
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }
  try {
    const newType = await LcrType.create({ name });
    res.status(201).json({ message: 'LCR Type created successfully', type: newType });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/lcrtypes/{id}:
 *   put:
 *     summary: Update an LCR Type
 *     tags: [LcrTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the LCR Type to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the LCR Type
 *     responses:
 *       200:
 *         description: LCR Type updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: LCR Type updated successfully
 *                 type:
 *                   $ref: '#/components/schemas/LcrType'
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: LCR Type not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Name is required' });
  }
  try {
    const type = await LcrType.findByPk(id);
    if (!type) {
      return res.status(404).json({ message: 'LCR Type not found' });
    }
    await type.update({ name });
    res.json({ message: 'LCR Type updated successfully', type });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/lcrtypes/{id}:
 *   delete:
 *     summary: Delete an LCR Type
 *     tags: [LcrTypes]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the LCR Type to delete
 *     responses:
 *       200:
 *         description: LCR Type deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: LCR Type deleted successfully
 *       404:
 *         description: LCR Type not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const type = await LcrType.findByPk(id);
    if (!type) {
      return res.status(404).json({ message: 'LCR Type not found' });
    }
    await type.destroy();
    res.json({ message: 'LCR Type deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
