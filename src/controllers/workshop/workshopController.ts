import { Request, Response } from 'express';
import { db } from '../../utils/firebase';
import { admin } from '../../utils/firebase';
import { Workshop, CreateWorkshopRequest } from '../../types/workshops';
import { MeetingService } from '../../services/meetingService';
import { WorkshopNotificationService } from '../../services/wsNotificationService';

export class WorkshopController {
  
  // Create workshop (only for Workshop Creators)
static async createWorkshop(req: Request, res: Response) {
  try {
    const { uid } = req.params;
    const workshopData: CreateWorkshopRequest = req.body;

    // Input validation
    if (!workshopData.title || workshopData.title.trim().length === 0) {
      return res.status(400).json({ error: 'Título do workshop é obrigatório' });
    }

    if (!workshopData.description || workshopData.description.trim().length === 0) {
      return res.status(400).json({ error: 'Descrição do workshop é obrigatória' });
    }

    if (!workshopData.scheduledDate) {
      return res.status(400).json({ error: 'Data do workshop é obrigatória' });
    }

    if (!workshopData.startTime) {
      return res.status(400).json({ error: 'Horário de início é obrigatório' });
    }

    // Verify user has Workshop Creator role
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const userData = userDoc.data();
    if (userData?.profile?.role !== 'workshop_creator') {
      return res.status(403).json({ 
        error: 'Only workshop creators can create workshops' 
      });
    }

    // 🔧 Combine date and time to create proper DateTime
    const scheduledDateTime = new Date(`${workshopData.scheduledDate}T${workshopData.startTime}:00`);
    
    console.log('🕐 Date validation debug:', {
      receivedDate: workshopData.scheduledDate,
      receivedTime: workshopData.startTime,
      combinedDateTime: scheduledDateTime,
      currentTime: new Date(),
      isInFuture: scheduledDateTime > new Date()
    });

    // Validate scheduled date (must be in the future)
    if (scheduledDateTime <= new Date()) {
      return res.status(400).json({ 
        error: `A data e horário do workshop devem ser no futuro. Data recebida: ${scheduledDateTime.toLocaleString('pt-BR', { timeZone: workshopData.timezone || 'America/Sao_Paulo' })}`
      });
    }

    // 🆕 Validate enrollment deadline if provided
    let enrollmentDeadlineDate = null;
    if (workshopData.enrollmentDeadline) {
      enrollmentDeadlineDate = new Date(`${workshopData.enrollmentDeadline}T23:59:59`);
      
      // Enrollment deadline should be before workshop date
      if (enrollmentDeadlineDate >= scheduledDateTime) {
        return res.status(400).json({ 
          error: 'Data limite de inscrição deve ser anterior à data do workshop' 
        });
      }
    }

    // Calculate duration if not provided
    let duration = workshopData.duration;
    if (!duration && workshopData.startTime && workshopData.endTime) {
      const start = new Date(`2000-01-01T${workshopData.startTime}:00`);
      const end = new Date(`2000-01-01T${workshopData.endTime}:00`);
      duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60)); // minutes
    }

    // Generate meeting link if needed
    let meetingInfo;
    if (workshopData.meetingType && !workshopData.meetingLink) {
      meetingInfo = await MeetingService.generateMeetingLink(
        workshopData.meetingType,
        workshopData.title,
        scheduledDateTime,
        duration || 120
      );
    } else {
      // Use provided meeting info
      meetingInfo = {
        link: workshopData.meetingLink || '',
        id: workshopData.meetingId || '',
        password: workshopData.meetingPassword || ''
      };
    }

    const workshop: Omit<Workshop, 'id'> = {
      title: workshopData.title.trim(),
      description: workshopData.description.trim(),
      category: workshopData.category,
      difficulty: workshopData.difficulty,
      duration: duration || 120, // Default 2 hours
      maxParticipants: workshopData.maxParticipants,
      prerequisites: workshopData.prerequisites || [],
      learningObjectives: workshopData.learningObjectives || [],
      tags: workshopData.tags || [],
      
      // Creator info (from auth and user data, not frontend)
      creatorId: uid,
      creatorName: userData?.name || 'Usuário',
      
      // Schedule - store as Date in database but keep string format for compatibility
      scheduledDate: scheduledDateTime,
      startTime: workshopData.startTime,
      endTime: workshopData.endTime || '',
      timezone: workshopData.timezone || 'America/Sao_Paulo',
      
      // Meeting info
      meetingType: workshopData.meetingType || 'teams',
      meetingLink: meetingInfo.link,
      meetingId: meetingInfo.id,
      
      // Status and metrics (set by backend, not frontend)
      status: 'draft',
      enrolledCount: 0,
      completedCount: 0,
      
      // Timestamps (set by backend)
      createdAt: new Date(),
      updatedAt: new Date(),
      
      // Settings - map frontend fields to backend
      autoGenerateCertificate: workshopData.issuesCertificate ?? true,
      sendReminders: workshopData.sendReminders ?? true,
      allowWaitlist: workshopData.allowWaitlist ?? false
    };

    // 🆕 Store additional metadata in a separate field if needed
    const additionalData = {
      shortDescription: workshopData.shortDescription,
      format: workshopData.format,
      requirements: workshopData.requirements,
      requiredTools: workshopData.requiredTools,
      targetAudience: workshopData.targetAudience,
      language: workshopData.language,
      location: workshopData.location,
      isRecorded: workshopData.isRecorded,
      isInteractive: workshopData.isInteractive,
      materialsProvided: workshopData.materialsProvided,
      autoApproveEnrollments: workshopData.autoApproveEnrollments,
      requiresCompletion: workshopData.requiresCompletion,
      price: workshopData.price,
      currency: workshopData.currency,
      meetingPassword: workshopData.meetingPassword,
      thumbnailUrl: workshopData.thumbnailUrl,
      bannerUrl: workshopData.bannerUrl,
      enrollmentDeadline: workshopData.enrollmentDeadline
    };

    // Save to Firestore with additional data
    const workshopRef = await db.collection('workshops').add({
      ...workshop,
      ...additionalData // Spread additional fields
    });

    // Update user's workshop creation count and XP
    await db.collection('users').doc(uid).update({
      engagement_xp: admin.firestore.FieldValue.increment(50), // +50 XP for creating workshop
      'stats.workshopsCreated': admin.firestore.FieldValue.increment(1)
    });

    console.log('✅ Workshop created successfully:', {
      id: workshopRef.id,
      title: workshop.title,
      scheduledDateTime: workshop.scheduledDate
    });

    res.status(201).json({
      id: workshopRef.id,
      ...workshop,
      ...additionalData,
      message: 'Workshop criado com sucesso!'
    });

  } catch (error) {
    console.error('❌ Erro ao criar workshop:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

  // Get workshop by ID
 static async getWorkshop(req: Request, res: Response) {
  try {
    const { workshopId } = req.params;

    const workshopDoc = await db.collection('workshops').doc(workshopId).get();
    if (!workshopDoc.exists) {
      return res.status(404).json({ error: 'Workshop não encontrado' });
    }

    const workshopData = workshopDoc.data();
    const workshop = {
      id: workshopDoc.id,
      ...workshopData,
      canEnroll: WorkshopController.canEnrollInWorkshop(workshopData), // Fixed: changed this to WorkshopController
      remainingSpots: Math.max(0, workshopData?.maxParticipants - workshopData?.enrolledCount)
    };

    res.json({ workshop });

  } catch (error) {
    console.error('Erro ao buscar workshop:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Get available workshops for enrollment
// Get available workshops for enrollment
static async getAvailableWorkshops(req: Request, res: Response) {
  try {
    console.log('🔍 [getAvailableWorkshops] Starting method execution');
    
    const { uid } = req.params;
    const { 
      category, 
      difficulty, 
      limit = 20, 
      lastCreatedAt,
      search
    } = req.query;

    console.log('📝 [getAvailableWorkshops] Parameters received:', {
      uid,
      category,
      difficulty,
      limit,
      lastCreatedAt,
      search
    });

    // 🔧 Use current timestamp for comparison instead of string date
    const now = new Date();
    console.log('📅 [getAvailableWorkshops] Current timestamp:', now);

    let query = db.collection('workshops')
      .where('status', '==', 'published')
      .where('scheduledDate', '>', now); // 🔧 Compare Timestamp with Timestamp

    console.log('🔍 [getAvailableWorkshops] Base query conditions:', {
      status: 'published',
      scheduledDateGreaterThan: now.toISOString()
    });

    if (category) {
      query = query.where('category', '==', category);
      console.log('🏷️ [getAvailableWorkshops] Added category filter:', category);
    }

    if (difficulty) {
      query = query.where('difficulty', '==', difficulty);
      console.log('⭐ [getAvailableWorkshops] Added difficulty filter:', difficulty);
    }

    // 🔧 Order by scheduledDate (Timestamp) directly
    query = query.orderBy('scheduledDate', 'asc').limit(Number(limit));
    console.log('📊 [getAvailableWorkshops] Added ordering and limit:', { orderBy: 'scheduledDate', limit: Number(limit) });

    if (lastCreatedAt) {
      // Convert lastCreatedAt to proper format for pagination
      const lastDate = new Date(lastCreatedAt as string);
      query = query.startAfter(lastDate);
      console.log('🔄 [getAvailableWorkshops] Added pagination startAfter:', lastDate);
    }

    console.log('🚀 [getAvailableWorkshops] Executing workshops query...');
    const snapshot = await query.get();
    console.log('📊 [getAvailableWorkshops] Workshops query results:', {
      totalDocs: snapshot.docs.length,
      isEmpty: snapshot.empty
    });

    // Log each workshop found
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      const scheduledDate = data.scheduledDate?.toDate ? data.scheduledDate.toDate() : new Date(data.scheduledDate);
      console.log(`📋 [getAvailableWorkshops] Workshop ${index + 1}:`, {
        id: doc.id,
        title: data.title,
        status: data.status,
        scheduledDate: scheduledDate.toISOString(),
        enrolledCount: data.enrolledCount,
        maxParticipants: data.maxParticipants,
        isInFuture: scheduledDate > now
      });
    });

    // 🆕 Get user's enrollments to check status
    console.log('🔍 [getAvailableWorkshops] Querying user enrollments for uid:', uid);
    const enrollmentsSnapshot = await db.collection('workshop_enrollments')
      .where('userId', '==', uid)
      .get();

    console.log('📊 [getAvailableWorkshops] User enrollments query results:', {
      totalEnrollments: enrollmentsSnapshot.docs.length,
      isEmpty: enrollmentsSnapshot.empty
    });

    // Create a map of workshop enrollments for quick lookup
    const userEnrollments = new Map();
    enrollmentsSnapshot.docs.forEach((doc, index) => {
      const enrollment = doc.data();
      userEnrollments.set(enrollment.workshopId, enrollment.status);
      console.log(`👤 [getAvailableWorkshops] Enrollment ${index + 1}:`, {
        workshopId: enrollment.workshopId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt
      });
    });

    console.log('🗺️ [getAvailableWorkshops] User enrollments map:', 
      Array.from(userEnrollments.entries()).map(([workshopId, status]) => ({ workshopId, status }))
    );

    console.log('🔄 [getAvailableWorkshops] Processing workshops...');
    let workshops = snapshot.docs.map((doc, index) => {
      const data = doc.data();
      const workshopId = doc.id;
      
      console.log(`\n🔍 [getAvailableWorkshops] Processing workshop ${index + 1} (${workshopId}):`);
      
      // 🔧 Properly handle Firestore Timestamp
      const scheduledDate = data.scheduledDate?.toDate ? data.scheduledDate.toDate() : new Date(data.scheduledDate);
      console.log(`  📅 Scheduled date conversion:`, {
        original: data.scheduledDate,
        converted: scheduledDate.toISOString(),
        isTimestamp: !!data.scheduledDate?.toDate
      });
      
      // Check if user has enrollment and what status
      const enrollmentStatus = userEnrollments.get(workshopId);
      console.log(`  📋 User enrollment status:`, enrollmentStatus || 'No enrollment found');
      
      // User can enroll if:
      // 1. Never enrolled (no enrollment found)
      // 2. Previously cancelled (status is 'cancelled')
      const canEnrollBasic = !enrollmentStatus || enrollmentStatus === 'cancelled';
      console.log(`  ✅ Can enroll (basic check):`, canEnrollBasic);
      
      // Additional checks
      const isPublished = data.status === 'published';
      const hasSpots = (data.enrolledCount || 0) < (data.maxParticipants || 0);
      const isFutureDate = scheduledDate > now;
      
      console.log(`  📊 Additional checks:`, {
        isPublished,
        hasSpots: hasSpots,
        enrolledCount: data.enrolledCount || 0,
        maxParticipants: data.maxParticipants || 0,
        isFutureDate,
        scheduledDate: scheduledDate.toISOString(),
        currentDate: now.toISOString(),
        timeDiff: scheduledDate.getTime() - now.getTime()
      });

      const finalCanEnroll = canEnrollBasic && isPublished && hasSpots && isFutureDate;
      console.log(`  🎯 Final canEnroll result:`, finalCanEnroll);

      const workshop = {
        id: workshopId,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        ...data,
        canEnroll: finalCanEnroll,
        remainingSpots: Math.max(0, data.maxParticipants - data.enrolledCount),
        enrollmentStatus: enrollmentStatus || null,
        // 🔧 Always convert to Date object for frontend consistency
        scheduledDate: scheduledDate,
        // Keep string version for pagination
        scheduledDateString: scheduledDate.toISOString()
      };

      console.log(`  📦 Workshop processed:`, {
        id: workshop.id,
        title: workshop.title,
        canEnroll: workshop.canEnroll,
        remainingSpots: workshop.remainingSpots,
        enrollmentStatus: workshop.enrollmentStatus,
        scheduledDate: workshop.scheduledDate.toISOString()
      });

      return workshop;
    });

    console.log(`\n📊 [getAvailableWorkshops] Workshops before search filter:`, workshops.length);

    // Apply search filter if provided
    if (search) {
      console.log('🔍 [getAvailableWorkshops] Applying search filter:', search);
      const searchLower = (search as string).toLowerCase();
      const beforeFilter = workshops.length;
      
      workshops = workshops.filter(workshop => {
        const matchTitle = workshop.title.toLowerCase().includes(searchLower);
        const matchDescription = workshop.description.toLowerCase().includes(searchLower);
        const matchTags = workshop.tags.some((tag: string) => tag.toLowerCase().includes(searchLower));
        const matches = matchTitle || matchDescription || matchTags;
        
        if (matches) {
          console.log(`  ✅ Workshop "${workshop.title}" matches search`);
        }
        
        return matches;
      });
      
      console.log(`🔍 [getAvailableWorkshops] Search filter results: ${beforeFilter} → ${workshops.length}`);
    }

    const response = {
      workshops,
      pagination: {
        limit: Number(limit),
        hasMore: workshops.length === Number(limit),
        lastCreatedAt: workshops.length > 0 
          ? workshops[workshops.length - 1].scheduledDateString
          : null
      }
    };

    console.log('📤 [getAvailableWorkshops] Final response:', {
      workshopCount: response.workshops.length,
      pagination: response.pagination,
      workshopTitles: response.workshops.map(w => w.title)
    });

    res.json(response);

  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ [getAvailableWorkshops] Error occurred:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

  // Get workshops created by user
  static async getUserCreatedWorkshops(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { status = 'all', limit = 20 } = req.query;

      let query = db.collection('workshops').where('creatorId', '==', uid);

      if (status !== 'all') {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('createdAt', 'desc').limit(Number(limit));

      const snapshot = await query.get();
      const workshops = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        scheduledDate: doc.data().scheduledDate?.toDate?.() || doc.data().scheduledDate
      }));

      res.json({ workshops });

    } catch (error) {
      console.error('Erro ao buscar workshops do criador:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

 // Get user workshop statistics
static async getUserWorkshopStats(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    // Get user's enrollments
    const enrollmentsSnapshot = await db.collection('workshop_enrollments')
      .where('userId', '==', uid)
      .get();

    const enrollments = enrollmentsSnapshot.docs.map(doc => doc.data());

    // Count enrollments by status
    const totalEnrollments = enrollments.length;
    const completedWorkshops = enrollments.filter(e => e.status === 'completed').length;

    // Get user's certificates
    const certificatesSnapshot = await db.collection('workshop_certificates')
      .where('userId', '==', uid)
      .get();

    const certificatesEarned = certificatesSnapshot.docs.length;

    // Get upcoming workshops (enrolled and not completed)
    const now = new Date();
    const upcomingWorkshopsPromises = enrollments
      .filter(enrollment => ['enrolled', 'waitlisted'].includes(enrollment.status))
      .map(async (enrollment): Promise<number> => {
        try {
          const workshopDoc = await db.collection('workshops').doc(enrollment.workshopId).get();
          const workshopData = workshopDoc.data();
          
          if (workshopData && workshopData.scheduledDate) {
            const workshopDate = workshopData.scheduledDate.toDate ? 
              workshopData.scheduledDate.toDate() : 
              new Date(workshopData.scheduledDate);
            
            return workshopDate > now ? 1 : 0;
          }
          return 0;
        } catch (error) {
          console.error('Erro ao verificar workshop:', error);
          return 0;
        }
      });

    const upcomingCounts = await Promise.all(upcomingWorkshopsPromises);
    // Fixed reduce with explicit types
    const upcomingWorkshops = upcomingCounts.reduce((sum: number, count: number) => sum + count, 0);

    // Additional stats
    const enrolledWorkshops = enrollments.filter(e => e.status === 'enrolled').length;
    const cancelledEnrollments = enrollments.filter(e => e.status === 'cancelled').length;
    const waitlistedWorkshops = enrollments.filter(e => e.status === 'waitlisted').length;

    // Calculate completion rate
    const completionRate = totalEnrollments > 0 
      ? ((completedWorkshops / totalEnrollments) * 100).toFixed(1)
      : '0';

    // Get recent activity (last 5 enrollments)
    const recentEnrollments = enrollments
      .sort((a, b) => {
        const dateA = a.enrolledAt?.toDate ? a.enrolledAt.toDate() : new Date(a.enrolledAt);
        const dateB = b.enrolledAt?.toDate ? b.enrolledAt.toDate() : new Date(b.enrolledAt);
        return dateB.getTime() - dateA.getTime();
      })
      .slice(0, 5)
      .map(enrollment => ({
        workshopId: enrollment.workshopId,
        status: enrollment.status,
        enrolledAt: enrollment.enrolledAt,
        completedAt: enrollment.completedAt
      }));

    const stats = {
      totalEnrollments,
      completedWorkshops,
      certificatesEarned,
      upcomingWorkshops,
      
      // Additional detailed stats
      enrolledWorkshops,
      cancelledEnrollments,
      waitlistedWorkshops,
      completionRate: parseFloat(completionRate),
      recentActivity: recentEnrollments
    };

    res.json(stats);

  } catch (error) {
    console.error('Erro ao buscar estatísticas do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

  // Update workshop
  static async updateWorkshop(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;
      const updates = req.body;

      // Get workshop
      const workshopDoc = await db.collection('workshops').doc(workshopId).get();
      if (!workshopDoc.exists) {
        return res.status(404).json({ error: 'Workshop não encontrado' });
      }

      const workshopData = workshopDoc.data();

      // Verify user is the creator
      if (workshopData?.creatorId !== uid) {
        return res.status(403).json({ 
          error: 'Apenas o criador pode editar o workshop' 
        });
      }

      // Don't allow updates if workshop is ongoing or completed
      if (['ongoing', 'completed'].includes(workshopData.status)) {
        return res.status(400).json({ 
          error: 'Não é possível editar workshop em andamento ou concluído' 
        });
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      // If meeting details changed, regenerate meeting link
      if (updates.scheduledDate || updates.title || updates.meetingType) {
        const meetingInfo = await MeetingService.generateMeetingLink(
          updates.meetingType || workshopData.meetingType,
          updates.title || workshopData.title,
          new Date(updates.scheduledDate || workshopData.scheduledDate),
          updates.duration || workshopData.duration
        );

        updateData.meetingLink = meetingInfo.link;
        updateData.meetingId = meetingInfo.id;
      }

      await workshopDoc.ref.update(updateData);

      res.json({ 
        message: 'Workshop atualizado com sucesso!',
        workshop: { id: workshopId, ...workshopData, ...updateData }
      });

    } catch (error) {
      console.error('Erro ao atualizar workshop:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Publish workshop (make it available for enrollment)
  static async publishWorkshop(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;

      const workshopDoc = await db.collection('workshops').doc(workshopId).get();
      if (!workshopDoc.exists) {
        return res.status(404).json({ error: 'Workshop não encontrado' });
      }

      const workshopData = workshopDoc.data();

      // Verify user is the creator
      if (workshopData?.creatorId !== uid) {
        return res.status(403).json({ 
          error: 'Apenas o criador pode publicar o workshop' 
        });
      }

      if (workshopData?.status !== 'draft') {
        return res.status(400).json({ 
          error: 'Apenas workshops em rascunho podem ser publicados' 
        });
      }

      await workshopDoc.ref.update({
        status: 'published',
        updatedAt: new Date()
      });

      // Schedule reminders
      await WorkshopNotificationService.scheduleWorkshopReminders({
        id: workshopId,
        ...workshopData
      } as Workshop);

      res.json({ message: 'Workshop publicado com sucesso!' });

    } catch (error) {
      console.error('Erro ao publicar workshop:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Cancel workshop
  static async cancelWorkshop(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;
      const { reason } = req.body;

      const workshopDoc = await db.collection('workshops').doc(workshopId).get();
      if (!workshopDoc.exists) {
        return res.status(404).json({ error: 'Workshop não encontrado' });
      }

      const workshopData = workshopDoc.data();

      // Verify user is the creator
      if (workshopData?.creatorId !== uid) {
        return res.status(403).json({ 
          error: 'Apenas o criador pode cancelar o workshop' 
        });
      }

      if (['completed', 'cancelled'].includes(workshopData.status)) {
        return res.status(400).json({ 
          error: 'Workshop já foi concluído ou cancelado' 
        });
      }

      // Get enrolled users
      const enrollmentsSnapshot = await db.collection('workshop_enrollments')
        .where('workshopId', '==', workshopId)
        .where('status', '==', 'enrolled')
        .get();

      const enrolledUserIds = enrollmentsSnapshot.docs.map(doc => doc.data().userId);

      const batch = db.batch();

      // Update workshop status
      batch.update(workshopDoc.ref, {
        status: 'cancelled',
        updatedAt: new Date(),
        cancellationReason: reason
      });

      // Update all enrollments to cancelled
      enrollmentsSnapshot.docs.forEach(doc => {
        batch.update(doc.ref, {
          status: 'cancelled',
          cancelledAt: new Date()
        });
      });

      await batch.commit();

      // Send cancellation notifications
      if (enrolledUserIds.length > 0) {
        await WorkshopNotificationService.sendWorkshopCancellation(
          enrolledUserIds,
          { id: workshopId, ...workshopData } as Workshop,
          reason
        );
      }

      res.json({ 
        message: 'Workshop cancelado com sucesso!',
        notifiedUsers: enrolledUserIds.length
      });

    } catch (error) {
      console.error('Erro ao cancelar workshop:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  

// Helper method to check if user can enroll in workshop
private static async canEnrollInWorkshop(workshopData: any, userId?: string): Promise<boolean> {
  if (!workshopData || !workshopData.scheduledDate) {
    return false;
  }

  // Check if date has passed
  const workshopDate = new Date(workshopData.scheduledDate);
  const now = new Date();
  
  if (now > workshopDate) {
    return false;
  }

  // Basic checks
  if (workshopData.status !== 'published') {
    return false;
  }

  if ((workshopData.enrolledCount || 0) >= (workshopData.maxParticipants || 0)) {
    return false;
  }

  // If no userId provided, return true (basic validation passed)
  if (!userId) {
    return true;
  }

  try {
    // Check if user has any enrollment for this workshop
    const enrollmentSnapshot = await db.collection('workshop_enrollments')
      .where('workshopId', '==', workshopData.id || workshopData.workshopId)
      .where('userId', '==', userId)
      .limit(1)
      .get();

    if (enrollmentSnapshot.empty) {
      return true; // User never enrolled, can enroll
    }

    const enrollment = enrollmentSnapshot.docs[0].data();
    
    // Return false if user has cancelled enrollment
    return enrollment.status !== 'cancelled';

  } catch (error) {
    console.error('Error checking user enrollment:', error);
    return true; // On error, allow enrollment
  }
}
}