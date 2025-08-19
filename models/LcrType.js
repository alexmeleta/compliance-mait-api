const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const LcrType = sequelize.define('LcrType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'Name'
  }
}, {
  tableName: 'LcrTypes',
  timestamps: false
});

module.exports = LcrType;
