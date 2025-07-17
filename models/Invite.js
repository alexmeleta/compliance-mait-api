'use strict';
const { Model } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Connection = require('./Connection');

const Invite = sequelize.define('Invite', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: 'ID'
    },
    guid: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false,
      unique: true,
      field: 'Guid'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true
      },
      field: 'Email'
    },
    senderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      },
      field: 'SenderId'
    },
    connectionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Connection,
        key: 'id'
      },
      field: 'ConnectionId'
    },
    sendOn: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'SendOn'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: 'IsActive'
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'IsDeleted'
    }
  }, {
    sequelize,
    modelName: 'Invite',
    tableName: 'Invites',
    timestamps: true,
    underscored: false,
    defaultScope: {
      where: {
        isDeleted: false
      }
    },
    scopes: {
      active: {
        where: {
          isActive: true,
          isDeleted: false
        }
      }
    }
  });
  
// At the bottom of the file, before module.exports:
Invite.associate = function(models) {
  Invite.belongsTo(models.Connection, {
    foreignKey: 'ConnectionId',
    as: 'connection',
    allowNull: true
  });
};


module.exports = Invite;
