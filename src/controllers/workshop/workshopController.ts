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

      // Validate scheduled date (must be in the future)
      const scheduledDate = new Date(workshopData.scheduledDate);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({ 
          error: 'A data do workshop deve ser no futuro' 
        });
      }

      // Generate meeting link
      const meetingInfo = await MeetingService.generateMeetingLink(
        workshopData.meetingType,
        workshopData.title,
        scheduledDate,
        workshopData.duration
      );

      const workshop: Omit<Workshop, 'id'> = {
        title: workshopData.title.trim(),
        description: workshopData.description.trim(),
        category: workshopData.category,
        difficulty: workshopData.difficulty,
        duration: workshopData.duration,
        maxParticipants: workshopData.maxParticipants,
        prerequisites: workshopData.prerequisites || [],
        learningObjectives: workshopData.learningObjectives || [],
        tags: workshopData.tags || [],
        creatorId: uid,
        creatorName: userData?.name || 'Usuário',
        scheduledDate,
        startTime: workshopData.startTime,
        endTime: workshopData.endTime,
        timezone: workshopData.timezone || 'America/Sao_Paulo',
        meetingType: workshopData.meetingType,
        meetingLink: meetingInfo.link,
        meetingId: meetingInfo.id,
        status: 'draft',
        enrolledCount: 0,
        completedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        autoGenerateCertificate: workshopData.autoGenerateCertificate ?? true,
        sendReminders: workshopData.sendReminders ?? true,
        allowWaitlist: workshopData.allowWaitlist ?? false
      };

      const workshopRef = await db.collection('workshops').add(workshop);

      // Update user's workshop creation count and XP
      await db.collection('users').doc(uid).update({
        engagement_xp: admin.firestore.FieldValue.increment(50), // +50 XP for creating workshop
        'stats.workshopsCreated': admin.firestore.FieldValue.increment(1)
      });

      res.status(201).json({
        id: workshopRef.id,
        ...workshop,
        message: 'Workshop criado com sucesso!'
      });

    } catch (error) {
      console.error('Erro ao criar workshop:', error);
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
static async getAvailableWorkshops(req: Request, res: Response) {
  try {
    const { 
      category, 
      difficulty, 
      limit = 20, 
      lastCreatedAt,
      search
    } = req.query;

    let query = db.collection('workshops')
      .where('status', '==', 'published')
      .where('scheduledDate', '>', new Date());

    if (category) {
      query = query.where('category', '==', category);
    }

    if (difficulty) {
      query = query.where('difficulty', '==', difficulty);
    }

    query = query.orderBy('scheduledDate', 'asc').limit(Number(limit));

    if (lastCreatedAt) {
      query = query.startAfter(new Date(lastCreatedAt as string));
    }

    const snapshot = await query.get();
    let workshops = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        tags: data.tags || [],
        ...data,
        canEnroll: WorkshopController.canEnrollInWorkshop(data), // Fixed: changed this to WorkshopController
        remainingSpots: Math.max(0, data.maxParticipants - data.enrolledCount),
        scheduledDate: data.scheduledDate?.toDate?.() || data.scheduledDate
      };
    });

    // Apply search filter if provided
    if (search) {
      const searchLower = (search as string).toLowerCase();
      workshops = workshops.filter(workshop => 
        workshop.title.toLowerCase().includes(searchLower) ||
        workshop.description.toLowerCase().includes(searchLower) ||
        workshop.tags.some((tag: string) => tag.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      workshops,
      pagination: {
        limit: Number(limit),
        hasMore: workshops.length === Number(limit),
        lastCreatedAt: workshops.length > 0 
          ? workshops[workshops.length - 1].scheduledDate 
          : null
      }
    });

  } catch (error) {
    console.error('Erro ao buscar workshops disponíveis:', error);
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
 private static canEnrollInWorkshop(workshopData: any): boolean {
  if (!workshopData || !workshopData.scheduledDate) {
    return false;
  }

  const workshopDate = new Date(workshopData.scheduledDate);
  const oneDayBefore = new Date(workshopDate.getTime() - 24 * 60 * 60 * 1000);
  const now = new Date();
  
  return now < oneDayBefore && 
         (workshopData.enrolledCount || 0) < (workshopData.maxParticipants || 0) &&
         workshopData.status === 'published';
}
}