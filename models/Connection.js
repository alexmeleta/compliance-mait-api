const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Invite = require('./Invite');

const Connection = sequelize.define('Connection', {
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
  recipientId: {
    type: DataTypes.INTEGER,
    field: 'RecipientID',
    references: {
      model: User,
      key: 'id'
    }
  },
  senderId: {
    type: DataTypes.INTEGER,
    field: 'SenderID',
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'Status'
  },
  isLcrAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'IsLcrAvailable'
  },
  autoSubmitAccuracyPercent: {
    type: DataTypes.DECIMAL(5, 2),
    field: 'AutoSubmitAccuracyPercent'
  },
  sentOn: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'SentOn'
  },
  note: {
    type: DataTypes.TEXT,
    field: 'Note'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'CreatedAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'UpdatedAt'
  },
  deletedAt: {
    type: DataTypes.DATE,
    field: 'DeletedAt'
  },
  isAccepted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'IsAccepted'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'IsDeleted'
  }
}, {
  tableName: 'Connections',
  timestamps: false
});

// Define associations
Connection.belongsTo(User, {
  foreignKey: 'recipientId',
  as: 'recipient',
  allowNull: true 
});

Connection.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

// Add hasOne association with Invite
Connection.hasOne(Invite, {
  foreignKey: 'ConnectionId',
  as: 'invite',
  required: false, // This ensures LEFT JOIN is used
  where: {
    isDeleted: false
  }
});

module.exports = Connection;
