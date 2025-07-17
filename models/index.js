const { sequelize } = require('../config/database');
const User = require('./User');
const Certificate = require('./Certificate');
const Connection = require('./Connection');
const Role = require('./Role');
const Permission = require('./Permission');
const RolePermission = require('./RolePermission');
const Jurisdiction = require('./Jurisdiction');
const Country = require('./Country');
const State = require('./State');
const Notification = require('./Notification');
const NotificationType = require('./NotificationType');
const UserCredential = require('./UserCredential');
const File = require('./File');
const CertificateFile = require('./CertificateFile');
const Invite = require('./Invite');
const UserAvatar = require('./UserAvatar');
const UserJurisdiction = require('./UserJurisdiction');
const UserName = require('./UserName');

// Add model associations
Country.hasMany(State, {
  foreignKey: 'countryCode',
  as: 'states'
});

State.belongsTo(Country, {
  foreignKey: 'countryCode',
  as: 'country'
});

// Jurisdiction associations
Jurisdiction.belongsTo(Country, {
  foreignKey: 'countryId',
  as: 'country'
});

Jurisdiction.belongsTo(State, {
  foreignKey: 'stateId',
  as: 'state'
});

Country.hasMany(Jurisdiction, {
  foreignKey: 'countryId',
  as: 'jurisdictions'
});

State.hasMany(Jurisdiction, {
  foreignKey: 'stateId',
  as: 'jurisdictions'
});

// UserJurisdiction associations
// User.belongsToMany(Jurisdiction, {
//   through: UserJurisdiction,
//   foreignKey: 'UserID',
//   otherKey: 'JurisdictionID',
//   as: 'jurisdictions'
// });

// Jurisdiction.belongsToMany(User, {
//   through: UserJurisdiction,
//   foreignKey: 'JurisdictionID',
//   otherKey: 'UserID',
//   as: 'users'
// });

// // UserName associations
// User.hasMany(UserName, {
//   foreignKey: 'UserID',
//   as: 'alternateNames'
// });

// UserName.belongsTo(User, {
//   foreignKey: 'UserID',
//   as: 'user'
// });

// Certificate associations
Certificate.belongsTo(Jurisdiction, {
  foreignKey: 'jurisdictionId',
  as: 'jurisdiction'
});

Jurisdiction.hasMany(Certificate, {
  foreignKey: 'jurisdictionId',
  as: 'certificates'
});

// Certificate-File associations through CertificateFile junction table
Certificate.belongsToMany(File, {
  through: CertificateFile,
  foreignKey: 'certificateId',
  otherKey: 'fileId',
  as: 'files'
});

File.belongsToMany(Certificate, {
  through: CertificateFile,
  foreignKey: 'fileId',
  otherKey: 'certificateId',
  as: 'certificates'
});

// Direct associations for easier querying
Certificate.hasMany(CertificateFile, {
  foreignKey: 'certificateId',
  as: 'certificateFiles'
});

CertificateFile.belongsTo(Certificate, {
  foreignKey: 'certificateId',
  as: 'certificate'
});

CertificateFile.belongsTo(File, {
  foreignKey: 'fileId',
  as: 'file'
});

File.hasMany(CertificateFile, {
  foreignKey: 'fileId',
  as: 'certificateFiles'
});

// File associations
File.belongsTo(User, {
  foreignKey: 'ownerId',
  as: 'owner'
});

User.hasMany(File, {
  foreignKey: 'ownerId',
  as: 'files'
});

// Notification associations
Notification.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

Notification.belongsTo(User, {
  foreignKey: 'recipientId',
  as: 'recipient'
});

Notification.belongsTo(NotificationType, {
  foreignKey: 'typeId',
  as: 'type'
});

User.hasMany(Notification, {
  foreignKey: 'senderId',
  as: 'sentNotifications'
});

User.hasMany(Notification, {
  foreignKey: 'recipientId',
  as: 'receivedNotifications'
});

NotificationType.hasMany(Notification, {
  foreignKey: 'typeId',
  as: 'notifications'
});

// UserCredential associations
UserCredential.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

User.hasMany(UserCredential, {
  foreignKey: 'userId',
  as: 'credentials'
});

// User associations
User.hasOne(UserAvatar, {
  foreignKey: 'userId',
  as: 'avatar'
});

UserAvatar.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

// Role and Permission associations
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions'
});

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles'
});

Role.hasMany(User, {
  foreignKey: 'roleId',
  as: 'users'
});

// Invite associations
Invite.belongsTo(User, {
  foreignKey: 'senderId',
  as: 'sender'
});

User.hasMany(Invite, {
  foreignKey: 'senderId',
  as: 'sentInvites'
});

// Export all models and the sequelize instance
module.exports = {
  sequelize,
  User,
  Certificate,
  Connection,
  Role,
  Permission,
  RolePermission,
  Jurisdiction,
  Country,
  State,
  Notification,
  NotificationType,
  UserCredential,
  File,
  CertificateFile,
  Invite,
  UserAvatar,
  UserJurisdiction,
  UserName
};
