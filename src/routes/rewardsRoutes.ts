import { Router }   from 'express';
import { RewardController } from '../controllers/rewardController';

const router = Router();

// User reward routes
router.get('/user/:uid/status', RewardController.getUserRewardStatus);
router.get('/user/:uid/history', RewardController.getUserRewardHistory);
router.post('/user/:uid/redeem', RewardController.redeemReward);

// Public reward routes
router.get('/available', RewardController.getAvailableRewards);

// Admin reward routes
router.post('/admin/create', RewardController.createReward);
router.put('/admin/update/:rewardId', RewardController.updateReward);
router.get('/admin/claims', RewardController.getAllRewardClaims);
router.put('admin/claims/:claimId/status' , RewardController.updateClaimStatus);

export default router;