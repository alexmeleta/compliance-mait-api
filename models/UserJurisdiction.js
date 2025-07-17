'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserJurisdiction = sequelize.define('UserJurisdiction', {
  UserID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Users',
      key: 'ID'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  },
  JurisdictionID: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'Jurisdictions',
      key: 'ID'
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE'
  }
}, {
  tableName: 'UserJurisdictions',
  timestamps: false,
  underscored: false
});

// Define associations in a separate block
UserJurisdiction.associate = (models) => {
  UserJurisdiction.belongsTo(models.User, {
    foreignKey: 'UserID',
    as: 'user'
  });
  
  UserJurisdiction.belongsTo(models.Jurisdiction, {
    foreignKey: 'JurisdictionID',
    as: 'jurisdiction'
  });
};

module.exports = UserJurisdiction;
