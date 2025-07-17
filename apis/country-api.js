const express = require('express');
const router = express.Router();
const { Country } = require('../models');
const { Op } = require('sequelize');

// Middleware to parse JSON bodies
router.use(express.json());

// GET /api/countries - Get all countries
router.get('/', async (req, res) => {
  try {
    const countries = await Country.findAll({
      order: [['countryName', 'ASC']]
    });
    res.json(countries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// GET /api/countries/:countryCode - Get country by country code
router.get('/:countryCode', async (req, res) => {
  const countryCode = req.params.countryCode;
  try {
    const country = await Country.findByPk(countryCode);
    
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    res.json(country);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// GET /api/countries/search/:term - Search countries by name
router.get('/search/:term', async (req, res) => {
  const searchTerm = req.params.term;
  try {
    const countries = await Country.findAll({
      where: {
        countryName: {
          [Op.iLike]: `%${searchTerm}%`
        }
      },
      order: [['countryName', 'ASC']]
    });
    
    res.json(countries);
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// POST /api/countries - Create a new country
router.post('/', async (req, res) => {
  const { countryCode, countryName, phoneCode, addressFormat } = req.body;

  if (!countryCode || !countryName) {
    return res.status(400).json({ message: 'Country Code and Country Name are required' });
  }

  if (countryCode.length !== 2) {
    return res.status(400).json({ message: 'Country Code must be exactly 2 characters' });
  }

  try {
    // Check if country already exists
    const existingCountry = await Country.findByPk(countryCode);
    if (existingCountry) {
      return res.status(409).json({ message: 'Country with this code already exists' });
    }

    // Create new country
    const newCountry = await Country.create({
      countryCode,
      countryName,
      phoneCode,
      addressFormat
    });

    res.status(201).json({
      message: 'Country created successfully',
      country: newCountry
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// PUT /api/countries/:countryCode - Update a country
router.put('/:countryCode', async (req, res) => {
  const countryCode = req.params.countryCode;
  const { countryName, phoneCode, addressFormat } = req.body;

  if (!countryName) {
    return res.status(400).json({ message: 'Country Name is required' });
  }

  try {
    const country = await Country.findByPk(countryCode);
    
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    // Update country
    await country.update({
      countryName,
      phoneCode,
      addressFormat
    });
    
    res.json({
      message: 'Country updated successfully',
      country
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

// DELETE /api/countries/:countryCode - Delete a country
router.delete('/:countryCode', async (req, res) => {
  const countryCode = req.params.countryCode;
  
  try {
    const country = await Country.findByPk(countryCode);
    
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    
    // Check if country is referenced by any jurisdictions
    const { Jurisdiction } = require('../models');
    const referencingJurisdictions = await Jurisdiction.findOne({
      where: {
        countryId: countryCode
      }
    });
    
    if (referencingJurisdictions) {
      return res.status(409).json({ 
        message: 'Cannot delete country because it is referenced by one or more jurisdictions' 
      });
    }
    
    // Delete country
    await country.destroy();
    
    res.json({
      message: 'Country deleted successfully'
    });
  } catch (err) {
    res.status(500).json({ message: 'Database error', error: err.message });
  }
});

module.exports = router;
