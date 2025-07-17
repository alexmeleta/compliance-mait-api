const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RolePermission = sequelize.define('RolePermission', {
  roleId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'RoleID'
  },
  permissionId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    field: 'PermissionID'
  }
}, {
  tableName: 'RolePermissions',
  timestamps: false,
  indexes: [
    {
      fields: ['RoleID']
    },
    {
      fields: ['PermissionID']
    }
  ]
});

// Set up associations
RolePermission.associate = (models) => {
  RolePermission.belongsTo(models.Role, {
    foreignKey: 'RoleID',
    as: 'role'
  });
  
  RolePermission.belongsTo(models.Permission, {
    foreignKey: 'PermissionID',
    as: 'permission'
  });
};

module.exports = RolePermission;
