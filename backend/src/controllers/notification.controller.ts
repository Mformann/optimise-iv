import { Response } from 'express';
import { notificationRepository } from '../repositories/notification.repository.js';
import { AuthenticatedRequest } from '../types/index.js';

export const notificationController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const unreadOnly = req.query.unread === 'true';

      const notifications = await notificationRepository.findByUser(userId, unreadOnly);
      const unreadCount = await notificationRepository.countUnread(userId);

      res.json({
        success: true,
        data: notifications,
        unread_count: unreadCount,
      });
    } catch (error) {
      console.error('Get notifications error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getUnreadCount(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationRepository.countUnread(userId);

      res.json({
        success: true,
        data: { count },
      });
    } catch (error) {
      console.error('Get unread count error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notificationRepository.findById(id);

      if (!notification) {
        res.status(404).json({ success: false, error: 'Notification not found' });
        return;
      }

      // Verify ownership
      if (notification.user_id !== req.user!.userId) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      await notificationRepository.markAsRead(id);

      res.json({
        success: true,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Mark notification read error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const count = await notificationRepository.markAllAsRead(userId);

      res.json({
        success: true,
        message: `${count} notifications marked as read`,
      });
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const notification = await notificationRepository.findById(id);

      if (!notification) {
        res.status(404).json({ success: false, error: 'Notification not found' });
        return;
      }

      // Verify ownership
      if (notification.user_id !== req.user!.userId) {
        res.status(403).json({ success: false, error: 'Not authorized' });
        return;
      }

      await notificationRepository.delete(id);

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      console.error('Delete notification error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};
