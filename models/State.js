const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const State = sequelize.define('State', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'Name'
  },
  countryCode: {
    type: DataTypes.CHAR(2),
    allowNull: false,
    field: 'CountryCode',
    references: {
      model: 'Countries',
      key: 'CountryCode'
    }
  }
}, {
  tableName: 'States',
  timestamps: false
});

module.exports = State;
