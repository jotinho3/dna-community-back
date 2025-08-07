import { db } from '../utils/firebase';
import { Request, Response } from 'express';

interface AdminUser {
  uid: string;
  name: any;
  email: any;
  role: string;
  isAdmin: boolean;
  created_at: any;
}

// 🆕 Add these notification interfaces
interface Notification {
  id?: string;
  userId: string;
  type: string;
  fromUserId: string;
  fromUserName: string;
  targetId: string;
  targetType: string;
  message: string;
  createdAt: FirebaseFirestore.Timestamp;
  read: boolean;
  metadata?: any;
}

interface NotificationWithUserDetails extends Notification {
  userDetails: {
    name: string;
    email: string;
    engagement_xp: number;
  } | null;
  fromUserDetails: {
    name: string;
    email: string;
  } | null;
}

interface ActivityStats {
  totalNotifications: number;
  readNotifications: number;
  unreadNotifications: number;
  notificationsByType: { [key: string]: number };
  notificationsByDay: { [key: string]: number };
  mostActiveUsers: { [key: string]: number };
  systemNotifications: number;
}

// 🆕 Add Question interfaces
interface Question {
  id?: string;
  authorName: string;
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  status?: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  isResolved?: boolean;
  viewCount?: number;
  upvotes?: number;
  downvotes?: number;
}

interface QuestionWithUserDetails extends Question {
  userDetails: {
    name: string;
    email: string;
    engagement_xp: number;
  } | null;
  answersCount: number;
}

interface Answer {
  id?: string;
  questionId: string;
  userId: string;
  content: string;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt?: FirebaseFirestore.Timestamp;
  isAccepted?: boolean;
  upvotes?: number;
  downvotes?: number;
}

interface AnswerWithUserDetails extends Answer {
  userDetails: {
    name: string;
    email: string;
  } | null;
}

interface QuestionStats {
  totalQuestions: number;
  totalAnswers: number;
  answeredQuestions: number;
  unansweredQuestions: number;
  questionsByCategory: { [key: string]: number };
  questionsByStatus: { [key: string]: number };
  questionsByDay: { [key: string]: number };
  averageAnswersPerQuestion: number;
  mostActiveAskers: { [key: string]: number };
}


export class AdminController {
  
  // Check if user is admin
  static async checkAdminStatus(req: Request, res: Response) {
    try {
      const { uid } = req.params;

      if (!uid) {
        return res.status(400).json({ 
          error: 'UID é obrigatório',
          isAdmin: false 
        });
      }

      // Get user document
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ 
          error: 'Usuário não encontrado',
          isAdmin: false 
        });
      }

      const userData = userDoc.data();
      
      // Check if user has admin role
      const isAdmin = userData?.profile?.role === 'admin' || userData?.isAdmin === true;

      console.log(`🔐 Admin check for user ${uid}: ${isAdmin ? 'ADMIN' : 'NOT ADMIN'}`);

      res.status(200).json({
        uid: uid,
        isAdmin: isAdmin,
        userRole: userData?.role || 'user',
        message: isAdmin ? 'Usuário é administrador' : 'Usuário não é administrador'
      });

    } catch (error) {
      console.error('Error checking admin status:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        isAdmin: false,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }


// Get all users with pagination
static async getAllUsers(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, search, role, hasCompletedOnboarding } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    console.log(`📊 Getting all users - Page: ${pageNum}, Limit: ${limitNum}`);

    let query: FirebaseFirestore.Query = db.collection('users');

    // Apply filters if provided
    if (role) {
      query = query.where('profile.role', '==', role);
      console.log(`🎭 Filtering by role: ${role}`);
    }

    if (hasCompletedOnboarding !== undefined) {
      const onboardingFilter = hasCompletedOnboarding === 'true';
      query = query.where('hasCompletedOnboarding', '==', onboardingFilter);
      console.log(`✅ Filtering by onboarding completed: ${onboardingFilter}`);
    }

    // Order by created_at (most recent first)
    query = query.orderBy('created_at', 'desc');

    // Apply pagination
    query = query.limit(limitNum).offset(offset);

    const snapshot = await query.get();

    let users = snapshot.docs.map(doc => {
      const data = doc.data();
      // Try to get name and email from root or from profile
      const name = data.name || data.profile?.name || '';
      const email = data.email || data.profile?.email || '';
      return {
        uid: doc.id,
        ...data,
        name,
        email
      };
    });

    // Apply search filter (post-query since Firestore doesn't support text search)
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      users = users.filter(user => 
        user.name?.toLowerCase().includes(searchTerm) ||
        user.email?.toLowerCase().includes(searchTerm)
      );
      console.log(`🔍 Applied search filter for: "${search}", found ${users.length} results`);
    }

    // Get total count for pagination (without filters for simplicity)
    const totalSnapshot = await db.collection('users').get();
    const totalUsers = totalSnapshot.size;

    console.log(`📈 Retrieved ${users.length} users from ${totalUsers} total`);

    res.status(200).json({
      users: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalUsers,
        totalPages: Math.ceil(totalUsers / limitNum),
        hasNextPage: pageNum < Math.ceil(totalUsers / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        search: search || null,
        role: role || null,
        hasCompletedOnboarding: hasCompletedOnboarding || null
      }
    });

  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get user details by ID (for admin panel)
static async getUserById(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    if (!uid) {
      return res.status(400).json({ error: 'UID é obrigatório' });
    }

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();

    // Get additional stats
    const [followersSnapshot, followingSnapshot, workshopsSnapshot] = await Promise.all([
      db.collection('followers').where('followingId', '==', uid).get(),
      db.collection('followers').where('followerId', '==', uid).get(),
      db.collection('workshop_enrollments').where('userId', '==', uid).get()
    ]);

    const userWithStats = {
      uid: userDoc.id,
      ...userData,
      stats: {
        followersCount: followersSnapshot.size,
        followingCount: followingSnapshot.size,
        workshopsEnrolled: workshopsSnapshot.size
      }
    };

    console.log(`👤 Retrieved user details for: ${uid}`);

    res.status(200).json({
      user: userWithStats
    });

  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

  // Optional: Get all admin users
  static async getAllAdmins(req: Request, res: Response) {
    try {
      const adminsSnapshot = await db
        .collection('users')
        .where('role', '==', 'admin')
        .get();

      const admins: AdminUser[] = adminsSnapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        role: doc.data().role,
        isAdmin: doc.data().isAdmin || true,
        created_at: doc.data().created_at
      }));

      // Also check for users with isAdmin flag
      const isAdminSnapshot = await db
        .collection('users')
        .where('isAdmin', '==', true)
        .get();

      const isAdminUsers: AdminUser[] = isAdminSnapshot.docs.map(doc => ({
        uid: doc.id,
        name: doc.data().name,
        email: doc.data().email,
        role: doc.data().role || 'admin',
        isAdmin: doc.data().isAdmin,
        created_at: doc.data().created_at
      }));

      // Combine and deduplicate
      const allAdmins: AdminUser[] = [...admins];
      isAdminUsers.forEach(user => {
        if (!allAdmins.find(admin => admin.uid === user.uid)) {
          allAdmins.push(user);
        }
      });

      res.status(200).json({
        admins: allAdmins,
        totalAdmins: allAdmins.length
      });

    } catch (error) {
      console.error('Error getting all admins:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Optional: Set user as admin (for other admins to use)
  static async setAdminStatus(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { isAdmin } = req.body;

      if (!uid) {
        return res.status(400).json({ error: 'UID é obrigatório' });
      }

      // Get user document
      const userDoc = await db.collection('users').doc(uid).get();

      if (!userDoc.exists) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      // Update admin status
      await db.collection('users').doc(uid).update({
        isAdmin: isAdmin,
        role: isAdmin ? 'admin' : 'user',
        updatedAt: new Date()
      });

      console.log(`🔐 Updated admin status for user ${uid}: ${isAdmin ? 'ADMIN' : 'USER'}`);

      res.status(200).json({
        message: `Status de administrador ${isAdmin ? 'concedido' : 'removido'} com sucesso`,
        uid: uid,
        isAdmin: isAdmin
      });

    } catch (error) {
      console.error('Error setting admin status:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

// Create new reward (Admin only)
static async createReward(req: Request, res: Response) {
  try {
    const {
      title,
      description,
      type,
      cost,
      category,
      imageUrl,
      isActive = true,
      stock,
      expiresAt,
      details
    } = req.body;

    // Validate required fields
    if (!title || !description || !type || !cost || !category) {
      return res.status(400).json({
        error: 'Campos obrigatórios: title, description, type, cost, category'
      });
    }

    // Validate type and category values
    const validTypes = ['digital', 'physical', 'experience', 'discount'];
    const validCategories = ['learning', 'merchandise', 'certification', 'exclusive_access', 'other'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: `Tipo inválido. Valores aceitos: ${validTypes.join(', ')}`
      });
    }

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Categoria inválida. Valores aceitos: ${validCategories.join(', ')}`
      });
    }

    // Validate cost is a positive number
    if (isNaN(cost) || cost <= 0) {
      return res.status(400).json({
        error: 'Custo deve ser um número positivo'
      });
    }

    // Create reward object
    const newReward = {
      title,
      description,
      type,
      cost: parseInt(cost),
      category,
      imageUrl: imageUrl || null,
      isActive,
      stock: stock ? parseInt(stock) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      details: details || {}
    };

    console.log(`🏆 Creating new reward: ${title} (${cost} tokens)`);

    // Save to Firestore
    const rewardRef = await db.collection('rewards').add(newReward);

    console.log(`✅ Reward created successfully with ID: ${rewardRef.id}`);

    res.status(201).json({
      message: 'Recompensa criada com sucesso!',
      rewardId: rewardRef.id,
      reward: {
        id: rewardRef.id,
        ...newReward
      }
    });

  } catch (error) {
    console.error('Error creating reward:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get all rewards (Admin view - includes inactive)
static async getAllRewards(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, category, type, isActive } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    console.log(`🏆 Getting all rewards - Page: ${pageNum}, Limit: ${limitNum}`);

    let query: FirebaseFirestore.Query = db.collection('rewards');

    // Apply filters if provided
    if (category) {
      query = query.where('category', '==', category);
    }

    if (type) {
      query = query.where('type', '==', type);
    }

    if (isActive !== undefined) {
      const activeFilter = isActive === 'true';
      query = query.where('isActive', '==', activeFilter);
    }

    // Order by created date (most recent first)
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    query = query.limit(limitNum).offset(offset);

    const snapshot = await query.get();

    const rewards = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get total count
    const totalSnapshot = await db.collection('rewards').get();
    const totalRewards = totalSnapshot.size;

    console.log(`📈 Retrieved ${rewards.length} rewards from ${totalRewards} total`);

    res.status(200).json({
      rewards,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalRewards,
        totalPages: Math.ceil(totalRewards / limitNum),
        hasNextPage: pageNum < Math.ceil(totalRewards / limitNum),
        hasPrevPage: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error getting all rewards:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Update reward (Admin only)
static async updateReward(req: Request, res: Response) {
  try {
    const { rewardId } = req.params;
    const updateData = req.body;

    if (!rewardId) {
      return res.status(400).json({ error: 'ID da recompensa é obrigatório' });
    }

    // Check if reward exists
    const rewardDoc = await db.collection('rewards').doc(rewardId).get();
    if (!rewardDoc.exists) {
      return res.status(404).json({ error: 'Recompensa não encontrada' });
    }

    // Update reward
    await db.collection('rewards').doc(rewardId).update({
      ...updateData,
      updatedAt: new Date()
    });

    console.log(`✅ Reward ${rewardId} updated successfully`);

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

// Delete reward (Admin only)
static async deleteReward(req: Request, res: Response) {
  try {
    const { rewardId } = req.params;

    if (!rewardId) {
      return res.status(400).json({ error: 'ID da recompensa é obrigatório' });
    }

    // Check if reward exists
    const rewardDoc = await db.collection('rewards').doc(rewardId).get();
    if (!rewardDoc.exists) {
      return res.status(404).json({ error: 'Recompensa não encontrada' });
    }

    // Instead of deleting, just mark as inactive
    await db.collection('rewards').doc(rewardId).update({
      isActive: false,
      updatedAt: new Date()
    });

    console.log(`🗑️ Reward ${rewardId} marked as inactive`);

    res.status(200).json({
      message: 'Recompensa desativada com sucesso!',
      rewardId
    });

  } catch (error) {
    console.error('Error deleting reward:', error);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

static async getAllActivity(req: Request, res: Response) {
    try {
      const { page = 1, limit = 50, type, userId, read, startDate, endDate } = req.query;

      const pageNum = parseInt(page as string);
      const limitNum = parseInt(limit as string);
      const offset = (pageNum - 1) * limitNum;

      console.log(`🔔 Getting all activity - Page: ${pageNum}, Limit: ${limitNum}`);

      let query: FirebaseFirestore.Query = db.collection('notifications');

      // Apply filters if provided
      if (type) {
        query = query.where('type', '==', type);
        console.log(`🎭 Filtering by type: ${type}`);
      }

      if (userId) {
        query = query.where('userId', '==', userId);
        console.log(`👤 Filtering by userId: ${userId}`);
      }

      if (read !== undefined) {
        const readFilter = read === 'true';
        query = query.where('read', '==', readFilter);
        console.log(`📖 Filtering by read status: ${readFilter}`);
      }

      // Order by creation date (most recent first)
      query = query.orderBy('createdAt', 'desc');

      // Apply pagination
      query = query.limit(limitNum).offset(offset);

      const snapshot = await query.get();

      let notifications: Notification[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Apply date filters (post-query since Firestore has limitations with complex queries)
      if (startDate) {
        const start = new Date(startDate as string);
        notifications = notifications.filter(notif => 
          notif.createdAt?.toDate() >= start
        );
      }

      if (endDate) {
        const end = new Date(endDate as string);
        notifications = notifications.filter(notif => 
          notif.createdAt?.toDate() <= end
        );
      }

      // Get user details for each notification
      const notificationsWithUserDetails: NotificationWithUserDetails[] = await Promise.all(
        notifications.map(async (notification) => {
          try {
            const userDoc = await db.collection('users').doc(notification.userId).get();
            const userData = userDoc.exists ? userDoc.data() : null;

            // Also get fromUser details if it's not 'system'
            let fromUserData = null;
            if (notification.fromUserId && notification.fromUserId !== 'system') {
              const fromUserDoc = await db.collection('users').doc(notification.fromUserId).get();
              fromUserData = fromUserDoc.exists ? fromUserDoc.data() : null;
            }

            return {
              ...notification,
              userDetails: userData ? {
                name: userData.name,
                email: userData.email,
                engagement_xp: userData.engagement_xp
              } : null,
              fromUserDetails: fromUserData ? {
                name: fromUserData.name,
                email: fromUserData.email
              } : null
            };
          } catch (error) {
            console.error(`Error fetching user details for notification ${notification.id}:`, error);
            return {
              ...notification,
              userDetails: null,
              fromUserDetails: null
            };
          }
        })
      );

      // Get total count for pagination
      const totalSnapshot = await db.collection('notifications').get();
      const totalNotifications = totalSnapshot.size;

      console.log(`📈 Retrieved ${notifications.length} notifications from ${totalNotifications} total`);

      res.status(200).json({
        notifications: notificationsWithUserDetails,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalNotifications,
          totalPages: Math.ceil(totalNotifications / limitNum),
          hasNextPage: pageNum < Math.ceil(totalNotifications / limitNum),
          hasPrevPage: pageNum > 1
        },
        filters: {
          type: type || null,
          userId: userId || null,
          read: read || null,
          startDate: startDate || null,
          endDate: endDate || null
        }
      });

    } catch (error) {
      console.error('Error getting all activity:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  static async getActivityStats(req: Request, res: Response) {
    try {
      const { period = '7d' } = req.query; // 7d, 30d, 90d

      console.log(`📊 Getting activity stats for period: ${period}`);

      let startDate: Date;
      const now = new Date();

      switch (period) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      }

      // Get notifications from the period
      const notificationsSnapshot = await db
        .collection('notifications')
        .where('createdAt', '>=', startDate)
        .get();

      const notifications: Notification[] = notificationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Notification));

      // Calculate statistics
      const stats: ActivityStats = {
        totalNotifications: notifications.length,
        readNotifications: notifications.filter(n => n.read).length,
        unreadNotifications: notifications.filter(n => !n.read).length,
        notificationsByType: {},
        notificationsByDay: {},
        mostActiveUsers: {},
        systemNotifications: notifications.filter(n => n.fromUserId === 'system').length
      };

      // Group by type
      notifications.forEach(notification => {
        const type = notification.type || 'unknown';
        stats.notificationsByType[type] = (stats.notificationsByType[type] || 0) + 1;
      });

      // Group by day
      notifications.forEach(notification => {
        if (notification.createdAt) {
          const day = notification.createdAt.toDate().toISOString().split('T')[0];
          stats.notificationsByDay[day] = (stats.notificationsByDay[day] || 0) + 1;
        }
      });

      // Count most active users (users receiving most notifications)
      notifications.forEach(notification => {
        const userId = notification.userId;
        stats.mostActiveUsers[userId] = (stats.mostActiveUsers[userId] || 0) + 1;
      });

      // Convert most active users to sorted array
      const sortedActiveUsers = Object.entries(stats.mostActiveUsers)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([userId, count]) => ({ userId, notificationCount: count }));

      console.log(`📊 Activity stats calculated for ${stats.totalNotifications} notifications`);

      res.status(200).json({
        period,
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: now.toISOString()
        },
        stats: {
          ...stats,
          mostActiveUsers: sortedActiveUsers
        }
      });

    } catch (error) {
      console.error('Error getting activity stats:', error);
      res.status(500).json({ 
        error: 'Erro interno do servidor',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }


 static async getNotificationDetails(req: Request, res: Response) {
  try {
    const { notificationId } = req.params;

    if (!notificationId) {
      return res.status(400).json({ error: 'ID da notificação é obrigatório' });
    }

    const notificationDoc = await db.collection('notifications').doc(notificationId).get();

    if (!notificationDoc.exists) {
      return res.status(404).json({ error: 'Notificação não encontrada' });
    }

    const notificationData = notificationDoc.data() as Notification;

    // Get user details
    const userDoc = await db.collection('users').doc(notificationData.userId).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    // Get fromUser details if applicable
    let fromUserData = null;
    if (notificationData.fromUserId && notificationData.fromUserId !== 'system') {
      const fromUserDoc = await db.collection('users').doc(notificationData.fromUserId).get();
      fromUserData = fromUserDoc.exists ? fromUserDoc.data() : null;
    }

    // 🔧 Better Fix: Destructure to exclude the problematic id, then add the correct one
    const { id: _, ...notificationWithoutId } = notificationData;
    
    const notificationWithDetails = {
      id: notificationDoc.id, // Use document ID
      ...notificationWithoutId, // Spread everything except the conflicting id
      userDetails: userData ? {
        uid: notificationData.userId,
        name: userData.name,
        email: userData.email,
        engagement_xp: userData.engagement_xp,
        profile: userData.profile
      } : null,
      fromUserDetails: fromUserData ? {
        uid: notificationData.fromUserId,
        name: fromUserData.name,
        email: fromUserData.email
      } : null
    };

    console.log(`📋 Retrieved notification details for: ${notificationId}`);

    res.status(200).json({
      notification: notificationWithDetails
    });

  } catch (error) {
    console.error('Error getting notification details:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

static async getAllQuestions(req: Request, res: Response) {
  try {
    const { page = 1, limit = 20, status, category, authorName, search, startDate, endDate } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    console.log(`❓ Getting all questions - Page: ${pageNum}, Limit: ${limitNum}`);

    let query: FirebaseFirestore.Query = db.collection('questions');

    // Apply filters if provided
    if (status) {
      query = query.where('status', '==', status);
      console.log(`📋 Filtering by status: ${status}`);
    }

    if (category) {
      query = query.where('category', '==', category);
      console.log(`🏷️ Filtering by category: ${category}`);
    }

    if (authorName) {
      query = query.where('authorName', '==', authorName);
      console.log(`👤 Filtering by authorName: ${authorName}`);
    }

    // Order by creation date (most recent first)
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    query = query.limit(limitNum).offset(offset);

    const snapshot = await query.get();

    let questions: Question[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Question));

    // Apply search filter (post-query since Firestore doesn't support text search)
    if (search) {
      const searchTerm = (search as string).toLowerCase();
      questions = questions.filter(question => 
        question.title?.toLowerCase().includes(searchTerm) ||
        question.description?.toLowerCase().includes(searchTerm) ||
        question.authorName?.toLowerCase().includes(searchTerm) ||
        question.tags?.some((tag: string) => tag.toLowerCase().includes(searchTerm))
      );
      console.log(`🔍 Applied search filter for: "${search}", found ${questions.length} results`);
    }

    // Apply date filters (post-query)
    if (startDate) {
      const start = new Date(startDate as string);
      questions = questions.filter(question => 
        question.createdAt?.toDate() >= start
      );
    }

    if (endDate) {
      const end = new Date(endDate as string);
      questions = questions.filter(question => 
        question.createdAt?.toDate() <= end
      );
    }

    // Get user details for each question based on authorName
    const questionsWithUserDetails: QuestionWithUserDetails[] = await Promise.all(
      questions.map(async (question) => {
        try {
          // 🔧 Fix: Use authorName instead of userId
          if (!question.authorName || question.authorName.trim() === '') {
            console.warn(`⚠️ Question ${question.id} has invalid authorName: "${question.authorName}"`);
            
            // Get answers count even if author is invalid
            const answersSnapshot = await db
              .collection('answers')
              .where('questionId', '==', question.id)
              .get();

            return {
              ...question,
              userDetails: {
                name: 'Autor inválido',
                email: 'N/A',
                engagement_xp: 0
              },
              answersCount: answersSnapshot.size
            };
          }

          // Try to find user by name (since we only have authorName)
          // Note: This is inefficient, but necessary with current data structure
          const usersSnapshot = await db
            .collection('users')
            .where('name', '==', question.authorName)
            .limit(1)
            .get();

          let userData = null;
          if (!usersSnapshot.empty) {
            userData = usersSnapshot.docs[0].data();
          }

          // Get answers count
          const answersSnapshot = await db
            .collection('answers')
            .where('questionId', '==', question.id)
            .get();

          return {
            ...question,
            userDetails: userData ? {
              name: userData.name || question.authorName,
              email: userData.email || 'Email não disponível',
              engagement_xp: userData.engagement_xp || 0
            } : {
              name: question.authorName,
              email: 'Usuário não encontrado no sistema',
              engagement_xp: 0
            },
            answersCount: answersSnapshot.size
          };
        } catch (error) {
          console.error(`Error fetching details for question ${question.id}:`, error);
          
          // Still try to get answers count
          let answersCount = 0;
          try {
            const answersSnapshot = await db
              .collection('answers')
              .where('questionId', '==', question.id)
              .get();
            answersCount = answersSnapshot.size;
          } catch (answersError) {
            console.error(`Error fetching answers for question ${question.id}:`, answersError);
          }

          return {
            ...question,
            userDetails: {
              name: question.authorName || 'Erro ao carregar autor',
              email: 'N/A',
              engagement_xp: 0
            },
            answersCount
          };
        }
      })
    );

    // Get total count for pagination
    const totalSnapshot = await db.collection('questions').get();
    const totalQuestions = totalSnapshot.size;

    console.log(`📈 Retrieved ${questions.length} questions from ${totalQuestions} total`);

    res.status(200).json({
      questions: questionsWithUserDetails,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalQuestions,
        totalPages: Math.ceil(totalQuestions / limitNum),
        hasNextPage: pageNum < Math.ceil(totalQuestions / limitNum),
        hasPrevPage: pageNum > 1
      },
      filters: {
        status: status || null,
        category: category || null,
        authorName: authorName || null,
        search: search || null,
        startDate: startDate || null,
        endDate: endDate || null
      }
    });

  } catch (error) {
    console.error('Error getting all questions:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

static async deleteQuestion(req: Request, res: Response) {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({ error: 'ID da pergunta é obrigatório' });
    }

    // Check if question exists
    const questionDoc = await db.collection('questions').doc(questionId).get();

    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const questionData = questionDoc.data() as Question;

    // Get all answers to this question
    const answersSnapshot = await db
      .collection('answers')
      .where('questionId', '==', questionId)
      .get();

    console.log(`🗑️ Deleting question ${questionId} with ${answersSnapshot.size} answers`);

    // Use batch to delete question and all related answers
    const batch = db.batch();

    // Delete the question
    batch.delete(questionDoc.ref);

    // Delete all answers
    answersSnapshot.docs.forEach(answerDoc => {
      batch.delete(answerDoc.ref);
    });

    // Delete related notifications
    const notificationsSnapshot = await db
      .collection('notifications')
      .where('targetId', '==', questionId)
      .get();

    notificationsSnapshot.docs.forEach(notifDoc => {
      batch.delete(notifDoc.ref);
    });

    await batch.commit();

    console.log(`✅ Successfully deleted question ${questionId}, ${answersSnapshot.size} answers, and ${notificationsSnapshot.size} notifications`);

    res.status(200).json({
      message: 'Pergunta deletada com sucesso!',
      questionId: questionId,
      deletedAnswers: answersSnapshot.size,
      deletedNotifications: notificationsSnapshot.size,
      questionTitle: questionData?.title || 'Título não disponível'
    });

  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get questions statistics (Admin dashboard)
static async getQuestionsStats(req: Request, res: Response) {
  try {
    const { period = '30d' } = req.query;

    console.log(`📊 Getting questions stats for period: ${period}`);

    let startDate: Date;
    const now = new Date();

    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get questions from the period
    const questionsSnapshot = await db
      .collection('questions')
      .where('createdAt', '>=', startDate)
      .get();

    const questions: Question[] = questionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Question));

    // Get all answers
    const answersSnapshot = await db
      .collection('answers')
      .where('createdAt', '>=', startDate)
      .get();

    const answers: Answer[] = answersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Answer));

    // Calculate statistics
    const stats: QuestionStats = {
      totalQuestions: questions.length,
      totalAnswers: answers.length,
      answeredQuestions: 0,
      unansweredQuestions: 0,
      questionsByCategory: {},
      questionsByStatus: {},
      questionsByDay: {},
      averageAnswersPerQuestion: 0,
      mostActiveAskers: {}
    };

    // Group questions by various metrics
    questions.forEach(question => {
      // By category
      const category = question.category || 'uncategorized';
      stats.questionsByCategory[category] = (stats.questionsByCategory[category] || 0) + 1;

      // By status
      const status = question.status || 'open';
      stats.questionsByStatus[status] = (stats.questionsByStatus[status] || 0) + 1;

      // By day
      if (question.createdAt) {
        const day = question.createdAt.toDate().toISOString().split('T')[0];
        stats.questionsByDay[day] = (stats.questionsByDay[day] || 0) + 1;
      }

      // 🔧 Fix: Count by authorName instead of userId
      const authorName = question.authorName;
      if (authorName) {
        stats.mostActiveAskers[authorName] = (stats.mostActiveAskers[authorName] || 0) + 1;
      }
    });

    // Calculate answered vs unanswered
    const questionIds = questionsSnapshot.docs.map(doc => doc.id);
    for (const questionId of questionIds) {
      const questionAnswers = answers.filter(answer => answer.questionId === questionId);
      if (questionAnswers.length > 0) {
        stats.answeredQuestions++;
      } else {
        stats.unansweredQuestions++;
      }
    }

    // Calculate average answers per question
    stats.averageAnswersPerQuestion = questions.length > 0 
      ? Math.round((answers.length / questions.length) * 100) / 100 
      : 0;

    // Convert most active askers to sorted array
    const sortedActiveAskers = Object.entries(stats.mostActiveAskers)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([authorName, count]) => ({ authorName, questionCount: count }));

    console.log(`📊 Questions stats calculated for ${stats.totalQuestions} questions and ${stats.totalAnswers} answers`);

    res.status(200).json({
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      },
      stats: {
        ...stats,
        mostActiveAskers: sortedActiveAskers
      }
    });

  } catch (error) {
    console.error('Error getting questions stats:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}

// Get specific question details (Admin)
static async getQuestionDetails(req: Request, res: Response) {
  try {
    const { questionId } = req.params;

    if (!questionId) {
      return res.status(400).json({ error: 'ID da pergunta é obrigatório' });
    }

    const questionDoc = await db.collection('questions').doc(questionId).get();

    if (!questionDoc.exists) {
      return res.status(404).json({ error: 'Pergunta não encontrada' });
    }

    const questionData = questionDoc.data() as Question;

    // 🔧 Fix: Use authorName to find user details
    let userData = null;
    if (questionData.authorName && questionData.authorName.trim() !== '') {
      try {
        const usersSnapshot = await db
          .collection('users')
          .where('name', '==', questionData.authorName)
          .limit(1)
          .get();

        if (!usersSnapshot.empty) {
          userData = usersSnapshot.docs[0].data();
        }
      } catch (userError) {
        console.error(`Error fetching user by name ${questionData.authorName}:`, userError);
        userData = null;
      }
    } else {
      console.warn(`⚠️ Question ${questionId} has invalid authorName: "${questionData.authorName}"`);
    }

    // Get all answers for this question
    const answersSnapshot = await db
      .collection('answers')
      .where('questionId', '==', questionId)
      .orderBy('createdAt', 'desc')
      .get();

    const answers: AnswerWithUserDetails[] = await Promise.all(
      answersSnapshot.docs.map(async (answerDoc) => {
        const answerData = answerDoc.data() as Answer;
        
        // 🔧 Fix: Validate userId for answers (answers still use userId)
        let answerUserData = null;
        if (answerData.userId && answerData.userId.trim() !== '') {
          try {
            const answerUserDoc = await db.collection('users').doc(answerData.userId).get();
            answerUserData = answerUserDoc.exists ? answerUserDoc.data() : null;
          } catch (answerUserError) {
            console.error(`Error fetching answer user ${answerData.userId}:`, answerUserError);
          }
        }

        return {
          id: answerDoc.id,
          ...answerData,
          userDetails: answerUserData ? {
            name: answerUserData.name || 'Nome não disponível',
            email: answerUserData.email || 'Email não disponível'
          } : {
            name: 'Usuário não encontrado',
            email: 'N/A'
          }
        };
      })
    );

    const questionWithDetails = {
      id: questionDoc.id,
      ...questionData,
      userDetails: userData ? {
        uid: userData.uid || 'unknown',
        name: userData.name || questionData.authorName,
        email: userData.email || 'Email não disponível',
        engagement_xp: userData.engagement_xp || 0,
        profile: userData.profile || {}
      } : {
        uid: 'unknown',
        name: questionData.authorName || 'Autor inválido',
        email: 'Usuário não encontrado no sistema',
        engagement_xp: 0,
        profile: {}
      },
      answers: answers,
      answersCount: answers.length
    };

    console.log(`📋 Retrieved question details for: ${questionId}`);

    res.status(200).json({
      question: questionWithDetails
    });

  } catch (error) {
    console.error('Error getting question details:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
}