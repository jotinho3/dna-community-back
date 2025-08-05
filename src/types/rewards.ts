export interface Reward {
  id: string;
  title: string;
  description: string;
  type: 'digital' | 'physical' | 'experience' | 'discount';
  cost: number; // reward tokens required
  category: 'learning' | 'merchandise' | 'certification' | 'exclusive_access' | 'other';
  imageUrl?: string;
  isActive: boolean;
  stock?: number; // for physical rewards
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  
  // Reward details
  details: {
    instructions?: string;
    redemptionCode?: string;
    downloadLink?: string;
    contactInfo?: string;
    validUntil?: Date;
  };
}

export interface UserRewardClaim {
  id: string;
  userId: string;
  rewardId: string;
  rewardTitle: string;
  tokensClaimed: number;
  levelWhenClaimed: number;
  xpWhenClaimed: number;
  claimedAt: Date;
  status: 'pending' | 'completed' | 'cancelled';
  deliveryInfo?: {
    address?: string;
    email?: string;
    phone?: string;
    notes?: string;
  };
}

export interface UserRewardToken {
  id: string;
  userId: string;
  level: number;
  xpWhenEarned: number;
  earnedAt: Date;
  isUsed: boolean;
  usedAt?: Date;
  usedForRewardId?: string;
}