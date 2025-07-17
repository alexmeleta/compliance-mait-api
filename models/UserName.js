'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserName = sequelize.define('UserName', {
  ID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  UserID: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'UserID',
    references: {
      model: 'Users',
      key: 'ID'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  FullName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'FullName',
    validate: {
      notEmpty: true
    }
  }
}, {
  tableName: 'UserNames',
  timestamps: false,
  underscored: false,
  indexes: [
    {
      fields: ['UserID']
    }
  ]
});

// Define associations in a separate block
UserName.associate = (models) => {
  UserName.belongsTo(models.User, {
    foreignKey: 'UserID',
    as: 'user'
  });
};

module.exports = UserName;
