const { Sequelize } = require('sequelize');
const config = require('./config');

// Initialize Sequelize with PostgreSQL connection from config
const sequelize = new Sequelize(config.database);

// Test the connection
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
};

module.exports = { sequelize, testConnection };
