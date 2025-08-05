import { db } from '../utils/firebase';
import { Request, Response } from 'express';
import { Reward, UserRewardClaim, UserRewardToken } from '../types/rewards';

export class RewardController {
  
  // Calculate user level based on XP
  private static calculateLevel(xp: number): number {
    return Math.floor(xp / 100); // Every 100 XP = 1 level
  }

  // Calculate available reward tokens (every 10 levels = 1 token)
  private static calculateAvailableTokens(level: number): number {
    return Math.floor(level / 10);
  }

// Get user reward status and available tokens
static async getUserRewardStatus(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();
    const currentXP = userData?.engagement_xp || 0;
    const currentLevel = RewardController.calculateLevel(currentXP);
    const maxAvailableTokens = RewardController.calculateAvailableTokens(currentLevel);

    // Get user's earned tokens
    const earnedTokensSnapshot = await db
      .collection('user_reward_tokens')
      .where('userId', '==', uid)
      .get();

    const earnedTokens = earnedTokensSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as UserRewardToken[];

    // Get unused tokens
    const unusedTokens = earnedTokens.filter(token => !token.isUsed);
    const usedTokens = earnedTokens.filter(token => token.isUsed);

    // Check if user can earn new tokens
    const tokensToEarn: number[] = [];
    for (let level = 10; level <= currentLevel; level += 10) {
      const tokenExists = earnedTokens.some(token => token.level === level);
      if (!tokenExists) {
        tokensToEarn.push(level);
      }
    }

    // Auto-earn new tokens if available
    if (tokensToEarn.length > 0) {
      console.log(`🏆 Auto-earning ${tokensToEarn.length} token(s) for user ${uid} at levels:`, tokensToEarn);
      
      const batch = db.batch();
      
      // Create tokens
      tokensToEarn.forEach(level => {
        const tokenRef = db.collection('user_reward_tokens').doc();
        batch.set(tokenRef, {
          userId: uid,
          level: level,
          xpWhenEarned: currentXP,
          earnedAt: new Date(),
          isUsed: false
        });
      });

      // 🆕 Create notification for earned tokens
      const notificationRef = db.collection('notifications').doc();
      const tokenWord = tokensToEarn.length === 1 ? 'token' : 'tokens';
      const levelsList = tokensToEarn.join(', ');
      
      batch.set(notificationRef, {
        userId: uid,
        type: 'reward_token_earned',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: 'reward_system',
        targetType: 'system',
        message: `🎉 Parabéns! Você ganhou ${tokensToEarn.length} ${tokenWord} de recompensa por atingir o nível ${currentLevel}! Use seus tokens para resgatar recompensas exclusivas.`,
        createdAt: new Date(),
        read: false,
        metadata: {
          tokensEarned: tokensToEarn.length,
          levelsAchieved: tokensToEarn,
          currentLevel: currentLevel,
          currentXP: currentXP,
          totalAvailableTokens: unusedTokens.length + tokensToEarn.length
        }
      });

      await batch.commit();

      console.log(`✅ Successfully created ${tokensToEarn.length} token(s) and notification for user ${uid}`);

      // Refresh earned tokens
      const newEarnedTokensSnapshot = await db
        .collection('user_reward_tokens')
        .where('userId', '==', uid)
        .get();

      const newEarnedTokens = newEarnedTokensSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRewardToken[];

      const newUnusedTokens = newEarnedTokens.filter(token => !token.isUsed);

      // Calculate next token milestone
      const nextTokenLevel = Math.ceil((currentLevel + 1) / 10) * 10;
      const xpToNextToken = (nextTokenLevel * 100) - currentXP;

      return res.status(200).json({
        currentXP,
        currentLevel,
        availableTokens: newUnusedTokens.length,
        totalEarnedTokens: newEarnedTokens.length,
        unusedTokens: newUnusedTokens,
        usedTokens: usedTokens,
        newTokensEarned: tokensToEarn.length,
        nextTokenLevel,
        xpToNextToken: xpToNextToken > 0 ? xpToNextToken : 0,
        message: `🎉 Você ganhou ${tokensToEarn.length} token(s) de recompensa!`,
        notificationSent: true // 🆕 Indicate notification was sent
      });
    }

    // No new tokens to earn
    const nextTokenLevel = Math.ceil((currentLevel + 1) / 10) * 10;
    const xpToNextToken = (nextTokenLevel * 100) - currentXP;

    res.status(200).json({
      currentXP,
      currentLevel,
      availableTokens: unusedTokens.length,
      totalEarnedTokens: earnedTokens.length,
      unusedTokens,
      usedTokens,
      newTokensEarned: 0,
      nextTokenLevel,
      xpToNextToken: xpToNextToken > 0 ? xpToNextToken : 0,
      notificationSent: false
    });

  } catch (error) {
    console.error('Error getting user reward status:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

  // Get all available rewards
  static async getAvailableRewards(req: Request, res: Response) {
    try {
      const { category, type, minCost, maxCost } = req.query;

      let query: FirebaseFirestore.Query = db
        .collection('rewards')
        .where('isActive', '==', true);

      if (category) {
        query = query.where('category', '==', category);
      }

      if (type) {
        query = query.where('type', '==', type);
      }

      query = query.orderBy('cost', 'asc');

      const snapshot = await query.get();
      let rewards = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reward[];

      // Filter by cost range (Firestore doesn't support range queries with other where clauses)
      if (minCost) {
        rewards = rewards.filter(reward => reward.cost >= parseInt(minCost as string));
      }
      if (maxCost) {
        rewards = rewards.filter(reward => reward.cost <= parseInt(maxCost as string));
      }

      res.status(200).json({
        rewards,
        totalRewards: rewards.length
      });

    } catch (error) {
      console.error('Error getting available rewards:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Redeem a reward using tokens
  static async redeemReward(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { rewardId, deliveryInfo } = req.body;

      // Get reward details
      const rewardDoc = await db.collection('rewards').doc(rewardId).get();
      if (!rewardDoc.exists) {
        return res.status(404).json({ error: 'Recompensa não encontrada' });
      }

      const rewardData = rewardDoc.data() as Reward;
      if (!rewardData.isActive) {
        return res.status(400).json({ error: 'Recompensa não está mais disponível' });
      }

      // Check if reward has stock
      if (rewardData.stock !== undefined && rewardData.stock <= 0) {
        return res.status(400).json({ error: 'Recompensa fora de estoque' });
      }

      // Get user's available tokens
      const availableTokensSnapshot = await db
        .collection('user_reward_tokens')
        .where('userId', '==', uid)
        .where('isUsed', '==', false)
        .get();

      const availableTokens = availableTokensSnapshot.docs.length;

      if (availableTokens < rewardData.cost) {
        return res.status(400).json({ 
          error: 'Tokens insuficientes',
          required: rewardData.cost,
          available: availableTokens
        });
      }

      // Get user data for claim record
      const userDoc = await db.collection('users').doc(uid).get();
      const userData = userDoc.data();
      const currentLevel = RewardController.calculateLevel(userData?.engagement_xp || 0);

      // Use tokens (mark as used)
      const batch = db.batch();
      const tokensToUse = availableTokensSnapshot.docs.slice(0, rewardData.cost);
      
      tokensToUse.forEach(tokenDoc => {
        batch.update(tokenDoc.ref, {
          isUsed: true,
          usedAt: new Date(),
          usedForRewardId: rewardId
        });
      });

      // Create reward claim
      const claimRef = db.collection('user_reward_claims').doc();
      batch.set(claimRef, {
        userId: uid,
        rewardId: rewardId,
        rewardTitle: rewardData.title,
        tokensClaimed: rewardData.cost,
        levelWhenClaimed: currentLevel,
        xpWhenClaimed: userData?.engagement_xp || 0,
        claimedAt: new Date(),
        status: 'pending',
        deliveryInfo: deliveryInfo || {}
      });

      // Update reward stock if applicable
      if (rewardData.stock !== undefined) {
        const rewardRef = db.collection('rewards').doc(rewardId);
        batch.update(rewardRef, {
          stock: rewardData.stock - 1,
          updatedAt: new Date()
        });
      }

      await batch.commit();

      res.status(201).json({
        message: 'Recompensa resgatada com sucesso!',
        claimId: claimRef.id,
        reward: {
          id: rewardId,
          title: rewardData.title,
          type: rewardData.type,
          cost: rewardData.cost
        },
        tokensUsed: rewardData.cost,
        remainingTokens: availableTokens - rewardData.cost
      });

    } catch (error) {
      console.error('Error redeeming reward:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Get user's reward history
  static async getUserRewardHistory(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      const claimsSnapshot = await db
        .collection('user_reward_claims')
        .where('userId', '==', uid)
        .orderBy('claimedAt', 'desc')
        .limit(limitNum)
        .offset(offset)
        .get();

      const claims = claimsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRewardClaim[];

      res.status(200).json({
        claims,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: claims.length
        }
      });

    } catch (error) {
      console.error('Error getting user reward history:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Admin: Create new reward
  static async createReward(req: Request, res: Response) {
    try {
      const rewardData: Omit<Reward, 'id' | 'createdAt' | 'updatedAt'> = req.body;

      const newReward = {
        ...rewardData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const rewardRef = await db.collection('rewards').add(newReward);

      res.status(201).json({
        message: 'Recompensa criada com sucesso!',
        rewardId: rewardRef.id,
        reward: { id: rewardRef.id, ...newReward }
      });

    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Admin: Update reward
  static async updateReward(req: Request, res: Response) {
    try {
      const { rewardId } = req.params;
      const updateData = req.body;

      const rewardRef = db.collection('rewards').doc(rewardId);
      const rewardDoc = await rewardRef.get();

      if (!rewardDoc.exists) {
        return res.status(404).json({ error: 'Recompensa não encontrada' });
      }

      await rewardRef.update({
        ...updateData,
        updatedAt: new Date()
      });

      res.status(200).json({
        message: 'Recompensa atualizada com sucesso!',
        rewardId
      });

    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Admin: Get all reward claims
  static async getAllRewardClaims(req: Request, res: Response) {
    try {
      const { status, page = 1, limit = 20 } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      let query: FirebaseFirestore.Query = db.collection('user_reward_claims');

      if (status) {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('claimedAt', 'desc').limit(limitNum).offset(offset);

      const snapshot = await query.get();
      const claims = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserRewardClaim[];

      res.status(200).json({
        claims,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: claims.length
        }
      });

    } catch (error) {
      console.error('Error getting reward claims:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Admin: Update claim status
  static async updateClaimStatus(req: Request, res: Response) {
    try {
      const { claimId } = req.params;
      const { status, notes } = req.body;

      const claimRef = db.collection('user_reward_claims').doc(claimId);
      const claimDoc = await claimRef.get();

      if (!claimDoc.exists) {
        return res.status(404).json({ error: 'Reivindicação não encontrada' });
      }

      await claimRef.update({
        status,
        notes,
        updatedAt: new Date()
      });

      res.status(200).json({
        message: 'Status da reivindicação atualizado com sucesso!',
        claimId,
        newStatus: status
      });

    } catch (error) {
      console.error('Error updating claim status:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}