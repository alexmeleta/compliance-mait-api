const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Jurisdiction = sequelize.define('Jurisdiction', {
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
  countryId: {
    type: DataTypes.CHAR(2),
    allowNull: false,
    field: 'CountryID',
    references: {
      model: 'Countries',
      key: 'CountryCode'
    }
  },
  stateId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'StateID',
    references: {
      model: 'States',
      key: 'ID'
    }
  }
}, {
  tableName: 'Jurisdictions',
  timestamps: false
});

module.exports = Jurisdiction;
