const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const NotificationType = require('./NotificationType');

const Notification = sequelize.define('Notification', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  guid: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
    defaultValue: DataTypes.UUIDV4,
    field: 'GUID'
  },
  typeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'TypeID',
    references: {
      model: NotificationType,
      key: 'id'
    }
  },
  recipientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'RecipientID',
    references: {
      model: User,
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'SenderID',
    references: {
      model: User,
      key: 'id'
    }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
    field: 'Message'
  },
  isReceived: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'IsReceived'
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'IsRead'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'CreatedAt'
  },
  title: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'Title'
  }
}, {
  tableName: 'Notifications',
  timestamps: false // CreatedAt is already handled in the model
});

module.exports = Notification;
