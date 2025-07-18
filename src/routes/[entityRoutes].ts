import express from 'express';
import { UserController, ProfileController, CompanyController, PlanController, SubcompanyController, NewsController, WorkshopController, UserWorkshopController, ForumController, PostController, ResponseController, ReactionController, FollowController, NotificationController, DailyQuestController, UserDailyQuestController, EngagementXpActionController, WorkshopPathController, WorkshopPathStepController, CertificationController } from '../controllers/[entityControllers]';

const router = express.Router();

// User routes
router.post('/users', UserController.create);
router.get('/users', UserController.getAll);
router.get('/users/:id', UserController.getById);
router.put('/users/:id', UserController.update);
router.delete('/users/:id', UserController.delete);

// Profile routes
router.post('/profiles', ProfileController.create);
router.get('/profiles', ProfileController.getAll);
router.get('/profiles/:id', ProfileController.getById);
router.put('/profiles/:id', ProfileController.update);
router.delete('/profiles/:id', ProfileController.delete);

// Company routes
router.post('/companies', CompanyController.create);
router.get('/companies', CompanyController.getAll);
router.get('/companies/:id', CompanyController.getById);
router.put('/companies/:id', CompanyController.update);
router.delete('/companies/:id', CompanyController.delete);

// Plan routes
router.post('/plans', PlanController.create);
router.get('/plans', PlanController.getAll);
router.get('/plans/:id', PlanController.getById);
router.put('/plans/:id', PlanController.update);
router.delete('/plans/:id', PlanController.delete);

// Subcompany routes
router.post('/subcompanies', SubcompanyController.create);
router.get('/subcompanies', SubcompanyController.getAll);
router.get('/subcompanies/:id', SubcompanyController.getById);
router.put('/subcompanies/:id', SubcompanyController.update);
router.delete('/subcompanies/:id', SubcompanyController.delete);

// News routes
router.post('/news', NewsController.create);
router.get('/news', NewsController.getAll);
router.get('/news/:id', NewsController.getById);
router.put('/news/:id', NewsController.update);
router.delete('/news/:id', NewsController.delete);

// Workshop routes
router.post('/workshops', WorkshopController.create);
router.get('/workshops', WorkshopController.getAll);
router.get('/workshops/:id', WorkshopController.getById);
router.put('/workshops/:id', WorkshopController.update);
router.delete('/workshops/:id', WorkshopController.delete);

// UserWorkshop routes
router.post('/userWorkshops', UserWorkshopController.create);
router.get('/userWorkshops', UserWorkshopController.getAll);
router.get('/userWorkshops/:id', UserWorkshopController.getById);
router.put('/userWorkshops/:id', UserWorkshopController.update);
router.delete('/userWorkshops/:id', UserWorkshopController.delete);

// Forum routes
router.post('/forums', ForumController.create);
router.get('/forums', ForumController.getAll);
router.get('/forums/:id', ForumController.getById);
router.put('/forums/:id', ForumController.update);
router.delete('/forums/:id', ForumController.delete);

// Post routes
router.post('/posts', PostController.create);
router.get('/posts', PostController.getAll);
router.get('/posts/:id', PostController.getById);
router.put('/posts/:id', PostController.update);
router.delete('/posts/:id', PostController.delete);

// Response routes
router.post('/responses', ResponseController.create);
router.get('/responses', ResponseController.getAll);
router.get('/responses/:id', ResponseController.getById);
router.put('/responses/:id', ResponseController.update);
router.delete('/responses/:id', ResponseController.delete);

// Reaction routes
router.post('/reactions', ReactionController.create);
router.get('/reactions', ReactionController.getAll);
router.get('/reactions/:id', ReactionController.getById);
router.put('/reactions/:id', ReactionController.update);
router.delete('/reactions/:id', ReactionController.delete);

// Follow routes
router.post('/follows', FollowController.create);
router.get('/follows', FollowController.getAll);
router.get('/follows/:id', FollowController.getById);
router.put('/follows/:id', FollowController.update);
router.delete('/follows/:id', FollowController.delete);

// Notification routes
router.post('/notifications', NotificationController.create);
router.get('/notifications', NotificationController.getAll);
router.get('/notifications/:id', NotificationController.getById);
router.put('/notifications/:id', NotificationController.update);
router.delete('/notifications/:id', NotificationController.delete);

// DailyQuest routes
router.post('/dailyQuests', DailyQuestController.create);
router.get('/dailyQuests', DailyQuestController.getAll);
router.get('/dailyQuests/:id', DailyQuestController.getById);
router.put('/dailyQuests/:id', DailyQuestController.update);
router.delete('/dailyQuests/:id', DailyQuestController.delete);

// UserDailyQuest routes
router.post('/userDailyQuests', UserDailyQuestController.create);
router.get('/userDailyQuests', UserDailyQuestController.getAll);
router.get('/userDailyQuests/:id', UserDailyQuestController.getById);
router.put('/userDailyQuests/:id', UserDailyQuestController.update);
router.delete('/userDailyQuests/:id', UserDailyQuestController.delete);

// EngagementXpAction routes
router.post('/engagementXpActions', EngagementXpActionController.create);
router.get('/engagementXpActions', EngagementXpActionController.getAll);
router.get('/engagementXpActions/:id', EngagementXpActionController.getById);
router.put('/engagementXpActions/:id', EngagementXpActionController.update);
router.delete('/engagementXpActions/:id', EngagementXpActionController.delete);

// WorkshopPath routes
router.post('/workshopPaths', WorkshopPathController.create);
router.get('/workshopPaths', WorkshopPathController.getAll);
router.get('/workshopPaths/:id', WorkshopPathController.getById);
router.put('/workshopPaths/:id', WorkshopPathController.update);
router.delete('/workshopPaths/:id', WorkshopPathController.delete);

// WorkshopPathStep routes
router.post('/workshopPathSteps', WorkshopPathStepController.create);
router.get('/workshopPathSteps', WorkshopPathStepController.getAll);
router.get('/workshopPathSteps/:id', WorkshopPathStepController.getById);
router.put('/workshopPathSteps/:id', WorkshopPathStepController.update);
router.delete('/workshopPathSteps/:id', WorkshopPathStepController.delete);

// Certification routes
router.post('/certifications', CertificationController.create);
router.get('/certifications', CertificationController.getAll);
router.get('/certifications/:id', CertificationController.getById);
router.put('/certifications/:id', CertificationController.update);
router.delete('/certifications/:id', CertificationController.delete);

export default router;