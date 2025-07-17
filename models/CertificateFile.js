const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Certificate = require('./Certificate');
const File = require('./File');

const CertificateFile = sequelize.define('CertificateFile', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  certificateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'CertificateID',
    references: {
      model: Certificate,
      key: 'ID'
    }
  },
  fileId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'FileID',
    references: {
      model: File,
      key: 'ID'
    }
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'IsDeleted'
  }
}, {
  tableName: 'CertificateFiles',
  timestamps: false
});

module.exports = CertificateFile;
