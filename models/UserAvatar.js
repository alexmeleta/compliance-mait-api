const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserAvatar = sequelize.define('UserAvatar', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  guid: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    allowNull: false,
    unique: true,
    field: 'GUID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserID',
    references: {
      model: 'Users',
      key: 'ID'
    }
  },
  content: {
    type: DataTypes.BLOB,
    allowNull: true,
    field: 'Content'
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'MimeType'
  },
  createdOn: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'CreatedOn'
  }
}, {
  tableName: 'UserAvatars',
  timestamps: false
});

module.exports = UserAvatar;
