const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const File = sequelize.define('File', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  guid: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'GUID'
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'Title'
  },
  type: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'Type'
  },
  ownerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'OwnerID',
    references: {
      model: User,
      key: 'ID'
    }
  },
  uploadedOn: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'UploadedOn'
  },
  content: {
    type: DataTypes.BLOB,
    allowNull: true,
    field: 'Content'
  },
  mimeType: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'MimeType'
  },
  accuracy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'Accuracy'
  }
}, {
  tableName: 'Files',
  timestamps: false
});

module.exports = File;
