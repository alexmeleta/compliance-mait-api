const { Notification, User, Role, NotificationType } = require('../models');
const { Op } = require('sequelize');

class NotificationsService {
  /**
   * Get all notifications for a specific user
   * @param {number} userId - The ID of the user to get notifications for
   * @param {boolean} unreadOnly - If true, only return unread notifications
   * @returns {Promise<Array>} - List of notifications with related data
   */
  async getNotificationsForUser(userId, unreadOnly = false) {
    try {
      const whereClause = {
        recipientId: userId
      };
      
      if (unreadOnly) {
        whereClause.isRead = false;
      }
      
      const notifications = await Notification.findAll({
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
            model: NotificationType,
            as: 'type',
            attributes: ['id', 'name']
          }
        ],
        order: [['createdAt', 'DESC']]
      });
      
      return notifications;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get a notification by ID
   * @param {number} id - The ID of the notification
   * @param {number} userId - The ID of the requesting user (for authorization)
   * @returns {Promise<Object>} - The notification with related data
   */
  async getNotificationById(id, userId = null) {
    try {
      const whereClause = {};
      
      // If userId is provided, ensure the notification belongs to that user
      if (userId) {
        whereClause.recipientId = userId;
      }
      
      const notification = await Notification.findByPk(id, {
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
            model: NotificationType,
            as: 'type',
            attributes: ['id', 'name']
          }
        ]
      });
      
      return notification;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Create a new notification
   * @param {Object} notificationData - The notification data
   * @param {number} notificationData.typeId - The notification type ID
   * @param {number} notificationData.recipientId - The recipient user ID
   * @param {number} notificationData.senderId - The sender user ID
   * @param {string} notificationData.message - The notification message
   * @param {string} notificationData.title - The notification title
   * @returns {Promise<Object>} - The created notification with related data
   */
  async createNotification({ typeId, recipientId, senderId, message, title }) {
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
      
    //   if (!sender) {
    //     throw new Error('Sender not found');
    //   }
      
      // Check if recipient exists if recipientId is provided
      if (recipientId) {
        const recipient = await User.findByPk(recipientId);
        if (!recipient) {
          throw new Error('Recipient not found');
        }
      }
      
      // Create new notification
      const newNotification = await Notification.create({
        typeId,
        recipientId,
        senderId,
        message,
        title,
        isReceived: false,
        isRead: false
      });
      
      // Fetch the created notification with user details
      const notificationWithUsers = await this.getNotificationById(newNotification.id);
      
      return notificationWithUsers;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Update a notification
   * @param {number} id - The ID of the notification to update
   * @param {Object} updateData - The data to update
   * @returns {Promise<Object>} - The updated notification with related data
   */
  async updateNotification(id, updateData) {
    try {
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      // Update notification with provided fields
      const { typeId, recipientId, senderId, message, isReceived, isRead, title } = updateData;
      
      await notification.update({
        typeId: typeId !== undefined ? typeId : notification.typeId,
        recipientId: recipientId !== undefined ? recipientId : notification.recipientId,
        senderId: senderId !== undefined ? senderId : notification.senderId,
        message: message !== undefined ? message : notification.message,
        isReceived: isReceived !== undefined ? isReceived : notification.isReceived,
        isRead: isRead !== undefined ? isRead : notification.isRead,
        title: title !== undefined ? title : notification.title
      });
      
      // Fetch the updated notification with user details
      const updatedNotification = await this.getNotificationById(id);
      
      return updatedNotification;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Mark a notification as read
   * @param {number} id - The ID of the notification to mark as read
   * @returns {Promise<Object>} - The updated notification
   */
  async markAsRead(id) {
    try {
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      // Mark as read
      await notification.update({ isRead: true });
      
      return notification;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Mark all notifications as read for a user
   * @param {number} userId - The ID of the user
   * @returns {Promise<number>} - The number of notifications marked as read
   */
  async markAllAsRead(userId) {
    try {
      // Update all unread notifications for the user
      const [updatedCount] = await Notification.update(
        { isRead: true },
        {
          where: {
            recipientId: userId,
            isRead: false
          }
        }
      );
      
      return updatedCount;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Delete a notification
   * @param {number} id - The ID of the notification to delete
   * @returns {Promise<boolean>} - True if deleted successfully
   */
  async deleteNotification(id) {
    try {
      const notification = await Notification.findByPk(id);
      
      if (!notification) {
        throw new Error('Notification not found');
      }
      
      // Delete notification
      await notification.destroy();
      
      return true;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new NotificationsService();
