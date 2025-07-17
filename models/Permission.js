const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Feature = require('./Feature'); // Reference the Feature object
const PermissionAction = require('./PermissionAction'); // Reference the PermissionAction object

const Permission = sequelize.define('Permission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: 'ID'
  },
  objectGuid: {
    type: DataTypes.UUID,
    allowNull: false,
    defaultValue: DataTypes.UUIDV4,
    field: 'ObjectGUID'
  },
  code: {
    type: DataTypes.STRING(101),
    allowNull: false,
    field: 'Code'
  },
  featureId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'FeatureID'
  },
  permissionActionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: 'PermissionActionID'
  }
}, {
  tableName: 'Permissions',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['Code']
    },
    {
      fields: ['FeatureID', 'PermissionActionID']
    }
  ]
});

// In Permission.js
Permission.associate = (models) => {
  Permission.belongsToMany(models.Role, {
    through: 'RolePermissions',
    foreignKey: 'PermissionID',
    otherKey: 'ID',
    as: 'roles',
    timestamps: false
  });
};

Permission.belongsTo(Feature, {
  foreignKey: 'featureId',
  as: 'feature'
});

Permission.belongsTo(PermissionAction, {
  foreignKey: 'permissionActionId',
  as: 'permissionAction'
});

module.exports = Permission;
