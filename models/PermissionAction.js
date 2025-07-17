const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const PermissionAction = sequelize.define('PermissionAction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  code: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'Code',
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    field: 'Description',
    allowNull: true
  }
}, {
  tableName: 'PermissionActions',
  timestamps: false
});


module.exports = PermissionAction;
