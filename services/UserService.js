// services/UserService.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sequelize } = require('../config/database');
const { User, UserCredential } = require('../models');

class UserService {
  constructor() {
    this.config = require('../config/config');
  }

  async registerUser({ email, password, firstName, lastName, loginName, roleId }) {
    const transaction = await sequelize.transaction();
    
    try {
      // Check if email already exists
      let existingUser = await User.findOne({ 
        where: { email },
        transaction
      });
      
      if (!existingUser) {
        // Create the user
        existingUser = await User.create({
          email,
          firstName,
          lastName,
          roleId: roleId || 1, // Default role if not specified
          isActive: true,
          isDeleted: false
        }, { transaction });
      }
      
      // Check if login name already exists for password auth
      let existingCredential = await UserCredential.findOne({
        where: { 
          loginName,
          authType: 'password'
        },
        transaction
      });
      
      if (existingCredential) {
        await transaction.rollback();
        throw new Error('Login name already in use');
      }
      
      // Hash the password
      const { hash, salt } = await this.hashPassword(password);
      
      // Create user credentials
      existingCredential = await UserCredential.create({
        userId: existingUser.id,
        authType: 'password',
        loginName,
        passwordHash: hash,
        passwordSalt: salt,
        lastPasswordChange: new Date(),
        passwordExpired: false,
        isActive: true,
        isDeleted: false
      }, { transaction });
      
      // Commit the transaction
      await transaction.commit();
      
      // Generate JWT token
      const token = this.generateToken(existingUser, existingCredential);
      
      return {
        message: 'User registered successfully',
        token,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          firstName: existingUser.firstName,
          lastName: existingUser.lastName,
          roleId: existingUser.roleId,
          avatarId: existingUser.avatarId
        }
      };
    } catch (err) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error('Registration error:', err);
      throw err;
    }
  }

  /**
 * Changes a user's password
 * @param {number} userId - The ID of the user
 * @param {string} currentPassword - The user's current password
 * @param {string} newPassword - The new password to set
 * @returns {Promise<Object>} - Success message
 * @throws {Error} - If current password is incorrect or user not found
 */
async changePassword(userId, currentPassword, newPassword) {
  const transaction = await sequelize.transaction();
  
  try {
    // Find the user's credential
    const credential = await UserCredential.findOne({
      where: { 
        userId,
        authType: 'password',
        isActive: true,
        isDeleted: false
      },
      include: [{
        model: User,
        as: 'user',
        where: {
          isActive: true,
          isDeleted: false
        }
      }],
      transaction
    });

    if (!credential || !credential.user) {
      await transaction.rollback();
      throw new Error('User not found or inactive');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, credential.passwordHash);
    if (!isPasswordValid) {
      await transaction.rollback();
      throw new Error('Current password is incorrect');
    }

    // Hash the new password
    const { hash, salt } = await this.hashPassword(newPassword);

    // Update the credential with new password
    await credential.update({
      passwordHash: hash,
      passwordSalt: salt,
      lastPasswordChange: new Date(),
      passwordExpired: false
    }, { transaction });

    // Commit the transaction
    await transaction.commit();

    return {
      success: true,
      message: 'Password changed successfully'
    };
  } catch (err) {
    await transaction.rollback();
    console.error('Password change error:', err);
    throw err; // Re-throw the error to be handled by the route
  }
}

  async hashPassword(password) {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return { hash, salt };
  }

  generateToken(user, credential) {
    return jwt.sign(
      {
        userId: user.id,
        roleId: user.roleId,
        credentialId: credential.id
      },
      this.config.jwt.secret,
      { expiresIn: this.config.jwt.expiresIn }
    );
  }
}

module.exports = new UserService();