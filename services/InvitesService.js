const { Invite, User, Connection } = require('../models');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { sendInvitationEmail } = require('./emailService');
const manageUsers = require('./UserService');
const connectionsService = require('./ConnectionsService');

class InvitesService {
  /**
   * Create a new invite
   * @param {Object} inviteData - The invite data
   * @param {string} inviteData.email - Email of the invitee
   * @param {number} inviteData.senderId - ID of the user sending the invite
   * @param {number} inviteData.connectionId - ID of the connection associated with this invite
   * @returns {Promise<Object>} - The created invite
   */
  async createInvite({ email, senderId, connectionId }) {
    try {
      // Check if user with this email already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      // Check if active invite already exists for this email
      let invite = await Invite.findOne({
        where: {
          email,
          isActive: true,
          isDeleted: false,
        },
      });

      if (!invite) {
        // Create new invite
        invite = await Invite.create({
          email,
          senderId,
          connectionId,
          sendOn: new Date(),
          isActive: true,
          isDeleted: false,
        });
      }

      return {
        guid: invite.guid,
        email: invite.email,
        sendOn: invite.sendOn,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get an invite by its GUID
   * @param {string} guid - The GUID of the invite
   * @returns {Promise<Object|null>} - The invite or null if not found
   */
  async getInviteByGuid(guid) {
    try {
      const invite = await Invite.scope('active').findOne({
        where: { guid },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
      });

      return invite;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Accept an invite and create a new user
   * @param {Object} userData - The user data
   * @param {string} userData.guid - The invite GUID
   * @param {string} userData.email - Email of the user
   * @param {string} userData.firstName - First name of the user
   * @param {string} userData.lastName - Last name of the user
   * @param {string} userData.password - Password for the new user
   * @param {string} [userData.dob] - Date of birth (optional)
   * @param {string} [userData.phone] - Phone number (optional)
   * @param {string} [userData.address] - Address (optional)
   * @returns {Promise<Object>} - The created user
   */
  async acceptInvite({ guid, email, firstName, lastName, password, dob, phone, address }) {
    const transaction = await sequelize.transaction();

    try {
      // Find and validate the invite
      const invite = await Invite.scope('active').findOne({
        where: { guid, email },
        transaction
      });

      if (!invite) {
        await transaction.rollback();
        throw new Error('Invalid or expired invite');
      }

      // Check if user already exists with this email
      const existingUser = await User.findOne({
        where: { email },
        transaction
      });

      if (existingUser) {
        await transaction.rollback();
        throw new Error('User with this email already exists');
      }

      // Use ManageUsers service to register the user
      // For invited users, use email as loginName
      const registrationResult = await manageUsers.registerUser({
        email,
        password,
        firstName,
        lastName,
        loginName: email, // Use email as loginName for invited users
        roleId: 1 // Default role ID for invited users
      });

      // Update the user with additional fields from the invite
      const user = await User.findByPk(registrationResult.user.id, { transaction });
      await user.update({
        dateOfBirth: dob ? new Date(dob) : null,
        phoneNumber: phone,
        address
      }, { transaction });

      // Mark the invite as used
      await invite.update({
        isActive: false,
        updatedAt: new Date()
      }, { transaction });

      // Commit the transaction
      await transaction.commit();

      return {
        userId: registrationResult.user.id,
        token: registrationResult.token
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get all invites for a user (as sender)
   * @param {number} senderId - The ID of the sender
   * @returns {Promise<Array>} - List of invites
   */
  async getInvitesBySender(senderId) {
    try {
      const invites = await Invite.findAll({
        where: { senderId },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
          },
        ],
      });

      return invites;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete an invite
   * @param {string} guid - The GUID of the invite to delete
   * @param {number} senderId - The ID of the sender (for authorization)
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteInvite(guid, senderId) {
    try {
      const invite = await Invite.findOne({
        where: { 
          guid,
          senderId
        }
      });

      if (!invite) {
        throw new Error('Invite not found or you are not authorized to delete it');
      }

      // Soft delete the invite
      await invite.update({
        isActive: false,
        isDeleted: true,
        updatedAt: new Date()
      });

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Resend an invitation email
   * @param {string} guid - The GUID of the invite
   * @param {number} senderId - The ID of the sender (for authorization)
   * @returns {Promise<Object>} - The updated invite
   */
  async resendInvite(guid, senderId) {
    try {
      const invite = await Invite.findOne({
        where: { 
          guid,
          senderId,
          isActive: true,
          isDeleted: false
        }
      });

      if (!invite) {
        throw new Error('Invite not found, expired, or you are not authorized to resend it');
      }

      // Update the sendOn date
      await invite.update({
        sendOn: new Date(),
        updatedAt: new Date()
      });

      try {
        // Send invitation email
        await sendInvitationEmail(invite.email, invite.guid);
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Continue even if email fails, but log the error
      }

      return {
        guid: invite.guid,
        email: invite.email,
        sendOn: invite.sendOn,
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new InvitesService();
