// controllers/notificationController.ts
import { Request, Response } from 'express';
import { db } from '../utils/firebase';

export class NotificationController {
  // Get user notifications (for initial load)
  static async getUserNotifications(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { limit = 20, lastCreatedAt } = req.query;

      let query = db.collection('notifications')
        .where('userId', '==', uid)
        .orderBy('createdAt', 'desc')
        .limit(Number(limit));

      if (lastCreatedAt) {
        query = query.startAfter(new Date(lastCreatedAt as string));
      }

      const snapshot = await query.get();
      const notifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt
      }));

      res.json({
        notifications,
        pagination: {
          limit: Number(limit),
          hasMore: notifications.length === Number(limit),
          lastCreatedAt: notifications.length > 0 
            ? notifications[notifications.length - 1].createdAt 
            : null
        }
      });
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Mark notification as read
  static async markAsRead(req: Request, res: Response) {
    try {
      const { notificationId } = req.params;

      await db.collection('notifications').doc(notificationId).update({
        read: true,
        readAt: new Date()
      });

      res.json({ message: 'Notificação marcada como lida' });
    } catch (error) {
      console.error('Erro ao marcar notificação:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Mark all notifications as read
  static async markAllAsRead(req: Request, res: Response) {
    try {
      const { uid } = req.params;

      const batch = db.batch();
      const snapshot = await db.collection('notifications')
        .where('userId', '==', uid)
        .where('read', '==', false)
        .get();

      snapshot.docs.forEach(doc => {
        batch.update(doc.ref, { 
          read: true, 
          readAt: new Date() 
        });
      });

      await batch.commit();

      res.json({ message: 'Todas as notificações marcadas como lidas' });
    } catch (error) {
      console.error('Erro ao marcar todas notificações:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Get unread count
  static async getUnreadCount(req: Request, res: Response) {
    try {
      const { uid } = req.params;

      const snapshot = await db.collection('notifications')
        .where('userId', '==', uid)
        .where('read', '==', false)
        .get();

      res.json({ unreadCount: snapshot.size });
    } catch (error) {
      console.error('Erro ao buscar contador:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}