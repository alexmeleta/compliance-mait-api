const { Connection, User, Role, Invite } = require('../models');
const { Op } = require('sequelize');

class ConnectionsService {
  /**
   * Get all connections for a user (as recipient or sender)
   * @param {number} userId - The ID of the user
   * @returns {Promise<Array>} - List of connections with related data
   */
  async getConnectionsForUser(userId) {
    try {
      const connections = await Connection.findAll({
        where: {
          [Op.or]: [
            { recipientId: userId },
            { senderId: userId }
          ]
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
            include: [
              {
                model: Role,
                as: 'role',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: User,
            as: 'recipient',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: Invite,
            required: false,
            as: 'invite',
            attributes: ['id', 'guid', 'email', 'senderId' ]
          }
        ]
      });
  
      // Transform the response to include sender and recipient details
      return connections.map(connection => this.transformConnection(connection));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get a connection by ID
   * @param {number} id - The ID of the connection
   * @param {number} userId - The ID of the requesting user (for authorization)
   * @returns {Promise<Object>} - The connection with related data
   */
  async getConnectionById(id, userId = null) {
    try {
        const whereClause = {
          [Op.and]: [
            { id },
            {
              [Op.or]: [
                { recipientId: userId },
                { senderId: userId }
              ]
            }
          ]
        };
      
      const connection = await Connection.findOne({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
            include: [
              {
                model: Role,
                as: 'role',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: User,
            as: 'recipient',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: Invite,
            required: false,
            as: 'invite',
            attributes: ['id', 'guid', 'email', 'senderId', 'sendOn' ]
          }
        ]
      });
      
      if (!connection) {
        return null;
      }
      
      return this.transformConnection(connection);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all connections for a user (as sender or recipient)
   * @param {number} userId - The ID of the user
   * @returns {Promise<Array>} - List of connections with related data
   */
  async getAllConnectionsForUser(userId) {
    try {
      const connections = await Connection.findAll({
        where: {
          [Op.or]: [
            { senderId: userId },
            { recipientId: userId }
          ]
        },
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'email', 'firstName', 'lastName'],
            include: [
              {
                model: Role,
                as: 'role',
                attributes: ['id', 'name']
              }
            ]
          },
          {
            model: User,
            as: 'recipient',
            attributes: ['id', 'email', 'firstName', 'lastName']
          },
          {
            model: Invite,
            as: 'invite',
            required: false,
            attributes: ['id', 'guid', 'email', 'senderId', 'sendOn' ]
          }
        ]
      });
      
      return connections.map(connection => this.transformConnection(connection));
    } catch (error) {
      throw error;
    }
  }

  /**
   * Create a new connection
   * @param {Object} connectionData - The connection data
   * @param {number} connectionData.recipientId - The recipient user ID
   * @param {number} connectionData.senderId - The sender user ID
   * @param {number} connectionData.status - Status of the connection (default 0=pending)
   * @param {boolean} connectionData.isLcrAvailable - Whether LCR is available
   * @param {number} connectionData.autoSubmitAccuracyPercent - Accuracy percentage for auto-submission
   * @param {string} connectionData.note - Optional note about the connection
   * @returns {Promise<Object>} - The created connection with related data
   */
  async createConnection({ recipientId, senderId, status, isLcrAvailable, autoSubmitAccuracyPercent, note }) {
    try {
      // Check if sender exists
      const sender = await User.findByPk(senderId, {
        include: [
          {
            model: Role,
            as: 'role',
            attributes: ['id', 'name']
          }
        ]
      });
      
      if (!sender) {
        throw new Error('Sender not found');
      }
      
      // Check if recipient exists
      const recipient = await User.findByPk(recipientId);
      if (!recipient) {
        throw new Error('Recipient not found');
      }
      
      // Create new connection
      const newConnection = await Connection.create({
        recipientId,
        senderId,
        status: status || 0,
        isLcrAvailable: isLcrAvailable || false,
        autoSubmitAccuracyPercent,
        note,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAccepted: false,
        isDeleted: false
      });
      
      return {
        id: newConnection.id,
        guid: newConnection.guid,
        recipientId: newConnection.recipientId,
        senderId: newConnection.senderId,
        status: newConnection.status,
        isLcrAvailable: newConnection.isLcrAvailable,
        autoSubmitAccuracyPercent: newConnection.autoSubmitAccuracyPercent,
        sentOn: newConnection.sentOn,
        note: newConnection.note,
        sender: {
          id: sender.id,
          email: sender.email,
          firstName: sender.firstName,
          lastName: sender.lastName,
          role: sender.role
        },
        recipient: {
          id: recipient.id,
          email: recipient.email,
          firstName: recipient.firstName,
          lastName: recipient.lastName
        }
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update a connection
   * @param {number} id - The ID of the connection to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} - The updated connection with related data
   */
  async updateConnection(id, updateData) {
    try {
      const connection = await Connection.findByPk(id);
      
      if (!connection) {
        throw new Error('Connection not found');
      }
      
      // Update connection with provided fields
      const { status, isLcrAvailable, autoSubmitAccuracyPercent, note } = updateData;
      
      await connection.update({
        status: status !== undefined ? status : connection.status,
        isLcrAvailable: isLcrAvailable !== undefined ? isLcrAvailable : connection.isLcrAvailable,
        autoSubmitAccuracyPercent: autoSubmitAccuracyPercent !== undefined ? autoSubmitAccuracyPercent : connection.autoSubmitAccuracyPercent,
        note: note !== undefined ? note : connection.note,
        updatedAt: new Date()
      });
      
      // Get updated connection with sender and recipient details
      const updatedConnection = await this.getConnectionById(id);
      
      return updatedConnection;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Delete a connection
   * @param {number} id - The ID of the connection to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteConnection(id) {
    try {
      const connection = await Connection.findByPk(id);
      
      if (!connection) {
        throw new Error('Connection not found');
      }
      
      // Delete the connection
      await connection.destroy();
      
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Transform a connection object to a standardized format
   * @param {Object} connection - The connection object from Sequelize
   * @returns {Object} - Transformed connection object
   * @private
   */
  transformConnection(connection) {
    const plainConnection = connection.get({ plain: true });
    const result = {
      id: plainConnection.id,
      guid: plainConnection.guid,
      status: plainConnection.status,
      isLcrAvailable: plainConnection.isLcrAvailable,
      autoSubmitAccuracyPercent: plainConnection.autoSubmitAccuracyPercent,
      sentOn: plainConnection.sentOn,
      note: plainConnection.note,
      createdAt: plainConnection.createdAt,
      updatedAt: plainConnection.updatedAt,
      isAccepted: plainConnection.isAccepted,
      isDeleted: plainConnection.isDeleted,
      sender: {
        ...plainConnection.sender,
        role: plainConnection.sender.role
      },
      recipient: plainConnection.recipient,
      invite: plainConnection.invite
    };

    return result;
  }
}

module.exports = new ConnectionsService();
