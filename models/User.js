const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Role = require('./Role');
const UserJurisdiction = require('./UserJurisdiction');
const UserName = require('./UserName');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    field: 'Email'
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'FirstName'
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'LastName'
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'PhoneNumber'
  },
  address: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'Address'
  },
  dateOfBirth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'DOB'
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'PasswordHash'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    field: 'IsActive'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'IsDeleted'
  },
  isAvailableForWork: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'IsAvailableForWork'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'CreatedAt'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'UpdatedAt'
  },
  roleId: {
    type: DataTypes.INTEGER,
    field: 'RoleID',
    references: {
      model: Role, // Reference the Role model object
      key: 'id'
    }
  }
}, {
  tableName: 'Users',
  timestamps: false
});

User.belongsTo(Role, {
  foreignKey: 'roleId',
  as: 'role'
});

User.hasMany(UserJurisdiction, {
    foreignKey: 'UserID',
    as: 'userJurisdictions'
});

User.hasMany(UserName, {
    foreignKey: 'UserID',
    as: 'alternateNames'
});

module.exports = User;
