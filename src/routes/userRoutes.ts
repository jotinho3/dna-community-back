import express from 'express';
import { checkOnboardingStatus, completeUserOnboarding } from '../controllers/userController';

const router = express.Router();

// Onboarding routes
router.get('/onboarding-status/:uid', checkOnboardingStatus);
router.post('/complete-onboarding/:uid', completeUserOnboarding);

// TODO: Add more user routes as needed
// router.get('/:uid', getUser);
// router.get('/', getAllUsers);
// router.delete('/:uid', deleteUser);

export default router;