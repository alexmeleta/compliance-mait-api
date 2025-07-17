const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Role = sequelize.define('Role', {
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
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    field: 'Name',
    unique: true
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'Description'
  }
}, {
  tableName: 'Roles',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['Name']
    }
  ]
});

// Set up associations
Role.associate = (models) => {
  Role.belongsToMany(models.Permission, {
    through: 'RolePermissions',
    foreignKey: 'RoleID',
    otherKey: 'PermissionID',
    as: 'permissions'
  });
};

module.exports = Role;