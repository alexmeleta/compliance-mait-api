const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const NotificationType = sequelize.define('NotificationType', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'Name'
  }
}, {
  tableName: 'NotificationTypes',
  timestamps: false
});

module.exports = NotificationType;
