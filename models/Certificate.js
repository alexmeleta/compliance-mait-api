const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Jurisdiction = require('./Jurisdiction');
const User = require('./User');

const Certificate = sequelize.define('Certificate', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'Title'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'Description'
  },
  lcrId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'LcrID',
    references: {
      model: 'LcrTemplates',
      key: 'ID'
    }
  },
  documentNumber: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'DocumentNumber'
  },
  expiryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'ExpiryDate'
  },
  issuedDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'IssuedDate'
  },
  issuedBy: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'IssuedBy'
  },
  issuingAuthority: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'IssuingAuthority'
  },
  jurisdictionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'JurisdictionID',
    references: {
      model: Jurisdiction,
      key: 'ID'
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserID',
    references: {
      model: User,
      key: 'ID'
    }
  },
  renewalFrequency: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'RenewalFrequency'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'IsDeleted'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'CreatedAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'UpdatedAt'
  }
}, {
  tableName: 'Certificates',
  timestamps: true
});

module.exports = Certificate;
