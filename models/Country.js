const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Country = sequelize.define('Country', {
  countryCode: {
    type: DataTypes.CHAR(2),
    primaryKey: true,
    field: 'CountryCode'
  },
  countryName: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'CountryName'
  },
  phoneCode: {
    type: DataTypes.STRING(10),
    allowNull: true,
    field: 'PhoneCode'
  },
  addressFormat: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'AddressFormat'
  }
}, {
  tableName: 'Countries',
  timestamps: false
});

module.exports = Country;
