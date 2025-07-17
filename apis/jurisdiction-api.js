const express = require('express');
const router = express.Router();
const { Jurisdiction, Country, State } = require('../models');
const { Op } = require('sequelize');

/**
 * @swagger
 * components:
 *   schemas:
 *     Jurisdiction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the jurisdiction
 *         name:
 *           type: string
 *           description: The name of the jurisdiction
 *         countryId:
 *           type: integer
 *           description: The ID of the country this jurisdiction belongs to
 *         stateId:
 *           type: integer
 *           description: The ID of the state this jurisdiction belongs to (optional)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: The date the jurisdiction was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: The date the jurisdiction was last updated
 *         country:
 *           type: object
 *           properties:
 *             countryCode:
 *               type: string
 *               description: The country code
 *             countryName:
 *               type: string
 *               description: The country name
 *         state:
 *           type: object
 *           properties:
 *             id:
 *               type: integer
 *               description: The state ID
 *             name:
 *               type: string
 *               description: The state name
 *       example:
 *         id: 1
 *         name: "New York City"
 *         countryId: 1
 *         stateId: 32
 *         createdAt: "2023-01-01T00:00:00.000Z"
 *         updatedAt: "2023-01-01T00:00:00.000Z"
 *         country:
 *           countryCode: "US"
 *           countryName: "United States"
 *         state:
 *           id: 32
 *           name: "New York"
 */

/**
 * @swagger
 * tags:
 *   name: Jurisdictions
 *   description: API for managing jurisdictions
 */

// Middleware to parse JSON bodies
router.use(express.json());

/**
 * @swagger
 * /api/jurisdictions:
 *   get:
 *     summary: Get all jurisdictions
 *     tags: [Jurisdictions]
 *     responses:
 *       200:
 *         description: List of jurisdictions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Jurisdiction'
 *       500:
 *         description: Server error
 */
router.get('/', async (req, res) => {
  try {
    const jurisdictions = await Jurisdiction.findAll({
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
      ],
      order: [['name', 'ASC']]
    });
    res.json(jurisdictions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions/{id}:
 *   get:
 *     summary: Get jurisdiction by ID
 *     tags: [Jurisdictions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the jurisdiction to retrieve
 *     responses:
 *       200:
 *         description: Jurisdiction details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Jurisdiction'
 *       404:
 *         description: Jurisdiction not found
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const jurisdiction = await Jurisdiction.findByPk(id, {
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
    });
    
    if (!jurisdiction) {
      return res.status(404).json({ message: 'Jurisdiction not found' });
    }
    
    res.json(jurisdiction);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions/country/{countryId}:
 *   get:
 *     summary: Get jurisdictions by country ID
 *     tags: [Jurisdictions]
 *     parameters:
 *       - in: path
 *         name: countryId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the country to filter jurisdictions by
 *     responses:
 *       200:
 *         description: List of jurisdictions for the specified country
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Jurisdiction'
 *       500:
 *         description: Server error
 */
router.get('/country/:countryId', async (req, res) => {
  const countryId = req.params.countryId;
  try {
    const jurisdictions = await Jurisdiction.findAll({
      where: {
        countryId: countryId
      },
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
      ],
      order: [['name', 'ASC']]
    });
    
    res.json(jurisdictions);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions/state/{stateId}:
 *   get:
 *     summary: Get jurisdictions by state ID
 *     tags: [Jurisdictions]
 *     parameters:
 *       - in: path
 *         name: stateId
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the state to filter jurisdictions by
 *     responses:
 *       200:
 *         description: List of jurisdictions for the specified state
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Jurisdiction'
 *       500:
 *         description: Server error
 */
router.get('/state/:stateId', async (req, res) => {
  const stateId = req.params.stateId;
  try {
    const jurisdictions = await Jurisdiction.findAll({
      where: {
        stateId: stateId
      },
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
      ],
      order: [['name', 'ASC']]
    });
    
    res.json(jurisdictions);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions:
 *   post:
 *     summary: Create a new jurisdiction
 *     tags: [Jurisdictions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - countryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the jurisdiction
 *               countryId:
 *                 type: integer
 *                 description: The ID of the country this jurisdiction belongs to
 *               stateId:
 *                 type: integer
 *                 description: The ID of the state this jurisdiction belongs to (optional)
 *     responses:
 *       201:
 *         description: Jurisdiction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Jurisdiction created successfully
 *                 jurisdiction:
 *                   $ref: '#/components/schemas/Jurisdiction'
 *       400:
 *         description: Bad request - Missing required fields
 *       500:
 *         description: Server error
 */
router.post('/', async (req, res) => {
  const { name, countryId, stateId } = req.body;

  if (!name || !countryId) {
    return res.status(400).json({ message: 'Name and Country ID are required' });
  }

  try {
    // Create new jurisdiction
    const newJurisdiction = await Jurisdiction.create({
      name,
      countryId,
      stateId
    });

    res.status(201).json({
      message: 'Jurisdiction created successfully',
      jurisdiction: newJurisdiction
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions/{id}:
 *   put:
 *     summary: Update a jurisdiction
 *     tags: [Jurisdictions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the jurisdiction to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - countryId
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the jurisdiction
 *               countryId:
 *                 type: integer
 *                 description: The ID of the country this jurisdiction belongs to
 *               stateId:
 *                 type: integer
 *                 description: The ID of the state this jurisdiction belongs to (optional)
 *     responses:
 *       200:
 *         description: Jurisdiction updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Jurisdiction updated successfully
 *                 jurisdiction:
 *                   $ref: '#/components/schemas/Jurisdiction'
 *       400:
 *         description: Bad request - Missing required fields
 *       404:
 *         description: Jurisdiction not found
 *       500:
 *         description: Server error
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, countryId, stateId } = req.body;

  if (!name || !countryId) {
    return res.status(400).json({ message: 'Name and Country ID are required' });
  }

  try {
    const jurisdiction = await Jurisdiction.findByPk(id);
    
    if (!jurisdiction) {
      return res.status(404).json({ message: 'Jurisdiction not found' });
    }
    
    // Update jurisdiction
    await jurisdiction.update({
      name,
      countryId,
      stateId
    });
    
    res.json({
      message: 'Jurisdiction updated successfully',
      jurisdiction
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

/**
 * @swagger
 * /api/jurisdictions/{id}:
 *   delete:
 *     summary: Delete a jurisdiction
 *     tags: [Jurisdictions]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID of the jurisdiction to delete
 *     responses:
 *       200:
 *         description: Jurisdiction deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Jurisdiction deleted successfully
 *       404:
 *         description: Jurisdiction not found
 *       500:
 *         description: Server error
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const jurisdiction = await Jurisdiction.findByPk(id);
    
    if (!jurisdiction) {
      return res.status(404).json({ message: 'Jurisdiction not found' });
    }
    
    // Delete jurisdiction
    await jurisdiction.destroy();
    
    res.json({
      message: 'Jurisdiction deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
