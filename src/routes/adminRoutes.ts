import { Router } from 'express';
import { AdminController } from '../controllers/adminController';

const router = Router();

// Check if user is admin
router.get('/check/:uid', AdminController.checkAdminStatus);

// Get all admin users
router.get('/admins', AdminController.getAllAdmins);

// Get all users with pagination and filters
router.get('/users', AdminController.getAllUsers);

// Get specific user details
router.get('/users/:uid', AdminController.getUserById);

// Set user admin status (for other admins)
router.put('/set/:uid', AdminController.setAdminStatus);

// Reward management routes
router.post('/rewards', AdminController.createReward);
router.get('/rewards', AdminController.getAllRewards);
router.put('/rewards/:rewardId', AdminController.updateReward);
router.delete('/rewards/:rewardId', AdminController.deleteReward);

// Activity/Notifications management routes
router.get('/activity', AdminController.getAllActivity);
router.get('/activity/stats', AdminController.getActivityStats);
router.get('/activity/notifications/:notificationId', AdminController.getNotificationDetails);

// 🆕 Questions management routes
router.get('/questions', AdminController.getAllQuestions);
router.get('/questions/stats', AdminController.getQuestionsStats);
router.get('/questions/:questionId', AdminController.getQuestionDetails);
router.delete('/questions/:questionId', AdminController.deleteQuestion);



export default router;