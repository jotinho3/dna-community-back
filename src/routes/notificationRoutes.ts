// routes/notificationRoutes.ts
import express from 'express';
import { NotificationController } from '../controllers/notificationController';

const router = express.Router();

router.get('/:uid', NotificationController.getUserNotifications);
router.get('/:uid/unread-count', NotificationController.getUnreadCount);
router.put('/:notificationId/read', NotificationController.markAsRead);
router.put('/:uid/mark-all-read', NotificationController.markAllAsRead);

export default router;