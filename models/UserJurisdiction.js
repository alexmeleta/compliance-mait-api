// In models/UserJurisdiction.js
'use strict';
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Jurisdiction = require('./Jurisdiction');

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

module.exports = UserJurisdiction;