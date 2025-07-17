const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');

const UserCredential = sequelize.define('UserCredential', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserID',
    references: {
      model: User,
      key: 'id'
    }
  },
  authType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    field: 'AuthType',
    validate: {
      isIn: [['password', 'openid']]
    }
  },
  loginName: {
    type: DataTypes.STRING(255),
    allowNull: false,
    field: 'LoginName'
  },
  passwordHash: {
    type: DataTypes.STRING(512),
    allowNull: true,
    field: 'PasswordHash'
  },
  passwordSalt: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'PasswordSalt'
  },
  lastPasswordChange: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'LastPasswordChange'
  },
  passwordExpired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'PasswordExpired'
  },
  openIdProvider: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'OpenIDProvider'
  },
  openIdSubject: {
    type: DataTypes.STRING(255),
    allowNull: true,
    field: 'OpenIDSubject'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    field: 'IsActive'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    field: 'IsDeleted'
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'CreatedAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'UpdatedAt'
  }
}, {
  tableName: 'UserCredentials',
  timestamps: true,
  hooks: {
    beforeValidate: (credential) => {
      // Validate mutual exclusivity of credentials
      if (credential.authType === 'password') {
        if (!credential.passwordHash || credential.openIdProvider) {
          throw new Error('Password auth type requires password hash and no OpenID provider');
        }
      } else if (credential.authType === 'openid') {
        if (!credential.openIdProvider || credential.passwordHash) {
          throw new Error('OpenID auth type requires provider and no password hash');
        }
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['OpenIDProvider', 'OpenIDSubject'],
      where: {
        OpenIDProvider: {
          [sequelize.Sequelize.Op.ne]: null
        },
        OpenIDSubject: {
          [sequelize.Sequelize.Op.ne]: null
        }
      }
    },
    {
      unique: true,
      fields: ['LoginName', 'AuthType']
    }
  ]
});

module.exports = UserCredential;
