const express = require('express');
const router = express.Router();
const { State, Country } = require('../models');
const { Op } = require('sequelize');

// Middleware to parse JSON bodies
router.use(express.json());

// GET /api/states - Get all states
router.get('/', async (req, res) => {
  try {
    const states = await State.findAll({
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ],
      order: [['name', 'ASC']]
    });
    res.json(states);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// GET /api/states/:id - Get state by ID
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const state = await State.findByPk(id, {
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ]
    });
    
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    
    res.json(state);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// GET /api/states/country/:countryCode - Get states by country code
router.get('/country/:countryCode', async (req, res) => {
  const countryCode = req.params.countryCode;
  try {
    const states = await State.findAll({
      where: {
        countryCode: countryCode
      },
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// GET /api/states/search/:term - Search states by name
router.get('/search/:term', async (req, res) => {
  const searchTerm = req.params.term;
  try {
    const states = await State.findAll({
      where: {
        name: {
          [Op.iLike]: `%${searchTerm}%`
        }
      },
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ],
      order: [['name', 'ASC']]
    });
    
    res.json(states);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// POST /api/states - Create a new state
router.post('/', async (req, res) => {
  const { name, countryCode } = req.body;

  if (!name || !countryCode) {
    return res.status(400).json({ message: 'Name and Country Code are required' });
  }

  try {
    // Check if country exists
    const country = await Country.findByPk(countryCode);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }

    // Create new state
    const newState = await State.create({
      name,
      countryCode
    });

    // Fetch the created state with country details
    const stateWithCountry = await State.findByPk(newState.id, {
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ]
    });

    res.status(201).json({
      message: 'State created successfully',
      state: stateWithCountry
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// PUT /api/states/:id - Update a state
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const { name, countryCode } = req.body;

  if (!name || !countryCode) {
    return res.status(400).json({ message: 'Name and Country Code are required' });
  }

  try {
    // Check if state exists
    const state = await State.findByPk(id);
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }

    // Check if country exists
    const country = await Country.findByPk(countryCode);
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    // Update state
    await state.update({
      name,
      countryCode
    });
    
    // Fetch the updated state with country details
    const updatedState = await State.findByPk(id, {
      include: [
        {
          model: Country,
          as: 'country',
          attributes: ['countryCode', 'countryName']
        }
      ]
    });
    
    res.json({
      message: 'State updated successfully',
      state: updatedState
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// DELETE /api/states/:id - Delete a state
router.delete('/:id', async (req, res) => {
  const id = req.params.id;
  
  try {
    const state = await State.findByPk(id);
    
    if (!state) {
      return res.status(404).json({ message: 'State not found' });
    }
    
    // Check if state is referenced by any jurisdictions
    const { Jurisdiction } = require('../models');
    const referencingJurisdictions = await Jurisdiction.findOne({
      where: {
        stateId: id
      }
    });
    
    if (referencingJurisdictions) {
      return res.status(409).json({ 
        message: 'Cannot delete state because it is referenced by one or more jurisdictions' 
      });
    }
    
    // Delete state
    await state.destroy();
    
    res.json({
      message: 'State deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
