import { Request, Response } from 'express';
import { db } from '../../utils/firebase';
import { admin } from '../../utils/firebase';
import { Workshop, WorkshopEnrollment } from '../../types/workshops';
import { WorkshopNotificationService } from '../../services/wsNotificationService';
import { CertificateService } from '../../services/certificateService';

export class EnrollmentController {

// Enroll in workshop
static async enrollWorkshop(req: Request, res: Response) {
  try {
    const { workshopId, uid } = req.params;

    // Check if workshop exists and is available
    const workshopDoc = await db.collection('workshops').doc(workshopId).get();
    if (!workshopDoc.exists) {
      return res.status(404).json({ error: 'Workshop não encontrado' });
    }

    const workshopData = workshopDoc.data();
    
    // 🔧 Fix: Properly handle Firestore Timestamp conversion
    let workshopDate: Date;
    if (workshopData?.scheduledDate?.toDate) {
      // It's a Firestore Timestamp
      workshopDate = workshopData.scheduledDate.toDate();
    } else if (workshopData?.scheduledDate instanceof Date) {
      // It's already a Date
      workshopDate = workshopData.scheduledDate;
    } else {
      // It's a string, convert to Date
      workshopDate = new Date(workshopData?.scheduledDate);
    }

    // Validate the date is valid
    if (isNaN(workshopDate.getTime())) {
      return res.status(400).json({ 
        error: 'Data do workshop inválida' 
      });
    }

    // const oneDayBefore = new Date(workshopDate.getTime() - 24 * 60 * 60 * 1000);

    // // Check if enrollment is still open (at least 1 day before)
    // if (new Date() >= oneDayBefore) {
    //   return res.status(400).json({ 
    //     error: 'Inscrições encerradas. É necessário se inscrever com pelo menos 1 dia de antecedência' 
    //   });
    // }

    // Check if workshop is published
    if (workshopData?.status !== 'published') {
      return res.status(400).json({ 
        error: 'Workshop não está disponível para inscrição' 
      });
    }

    // 🆕 Check existing enrollment status
    const existingEnrollmentSnapshot = await db.collection('workshop_enrollments')
      .where('workshopId', '==', workshopId)
      .where('userId', '==', uid)
      .orderBy('enrolledAt', 'desc')
      .limit(1)
      .get();

    let existingEnrollmentDoc = null;
    let existingEnrollmentData = null;

    if (!existingEnrollmentSnapshot.empty) {
      existingEnrollmentDoc = existingEnrollmentSnapshot.docs[0];
      existingEnrollmentData = existingEnrollmentDoc.data();

      // Check current enrollment status
      switch (existingEnrollmentData.status) {
        case 'enrolled':
          return res.status(400).json({ 
            error: 'Você já está inscrito neste workshop' 
          });
        
        case 'waitlisted':
          return res.status(400).json({ 
            error: 'Você já está na lista de espera deste workshop' 
          });
        
        case 'completed':
          return res.status(400).json({ 
            error: 'Você já concluiu este workshop' 
          });
        
        case 'attended':
          return res.status(400).json({ 
            error: 'Você já participou deste workshop' 
          });
        
        case 'no_show':
        case 'cancelled':
          console.log(`User ${uid} re-enrolling in workshop ${workshopId} after ${existingEnrollmentData.status}`);
          break;
        
        default:
          console.log(`Unknown enrollment status: ${existingEnrollmentData.status}, allowing enrollment`);
          break;
      }
    }

    // Get user data
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }
    const userData = userDoc.data();

    // 🔧 Create complete workshop object with proper date handling
    const workshop: Workshop = {
      id: workshopId,
      title: workshopData.title || '',
      description: workshopData.description || '',
      category: workshopData.category || 'other',
      difficulty: workshopData.difficulty || 'beginner',
      duration: workshopData.duration || 0,
      maxParticipants: workshopData.maxParticipants || 0,
      prerequisites: workshopData.prerequisites || [],
      learningObjectives: workshopData.learningObjectives || [],
      tags: workshopData.tags || [],
      
      // Creator info
      creatorId: workshopData.creatorId || '',
      creatorName: workshopData.creatorName || '',
      
      // 🔧 Use the properly converted date
      scheduledDate: workshopDate,
      startTime: workshopData.startTime || '',
      endTime: workshopData.endTime || '',
      timezone: workshopData.timezone || 'America/Sao_Paulo',
      
      // Meeting info
      meetingType: workshopData.meetingType || 'teams',
      meetingLink: workshopData.meetingLink,
      meetingId: workshopData.meetingId,
      
      // Status and metrics
      status: workshopData.status || 'draft',
      enrolledCount: workshopData.enrolledCount || 0,
      completedCount: workshopData.completedCount || 0,
      
      // 🔧 Properly handle timestamps with validation
      createdAt: workshopData.createdAt?.toDate ? workshopData.createdAt.toDate() : 
                 (workshopData.createdAt instanceof Date ? workshopData.createdAt : new Date()),
      updatedAt: workshopData.updatedAt?.toDate ? workshopData.updatedAt.toDate() : 
                 (workshopData.updatedAt instanceof Date ? workshopData.updatedAt : new Date()),
      
      // Settings
      autoGenerateCertificate: workshopData.autoGenerateCertificate || false,
      sendReminders: workshopData.sendReminders || false,
      allowWaitlist: workshopData.allowWaitlist || false
    };

    // Check capacity
    if (workshopData.enrolledCount >= workshopData.maxParticipants) {
      if (workshopData.allowWaitlist) {
        // Handle re-enrollment for waitlist
        const enrollmentData: Omit<WorkshopEnrollment, 'id'> = {
          workshopId,
          userId: uid,
          userName: userData?.name || 'Usuário',
          userEmail: userData?.email || '',
          enrolledAt: new Date(),
          status: 'waitlisted'
        };

        if (existingEnrollmentDoc && existingEnrollmentData?.status === 'cancelled') {
          // Update existing cancelled enrollment
          await existingEnrollmentDoc.ref.update({
            ...enrollmentData,
            previousStatus: existingEnrollmentData.status,
            reEnrolledAt: new Date(),
            cancelledAt: admin.firestore.FieldValue.delete()
          });

          return res.status(201).json({
            message: 'Adicionado à lista de espera!',
            workshop: workshop,
            enrollment: { 
              id: existingEnrollmentDoc.id, 
              ...enrollmentData,
              previousStatus: existingEnrollmentData.status,
              isReEnrollment: true
            },
            status: 'waitlisted'
          });
        } else {
          // Create new enrollment
          const enrollmentRef = await db.collection('workshop_enrollments').add(enrollmentData);

          return res.status(201).json({
            message: 'Adicionado à lista de espera!',
            workshop: workshop,
            enrollment: { id: enrollmentRef.id, ...enrollmentData },
            status: 'waitlisted'
          });
        }
      } else {
        return res.status(400).json({ error: 'Workshop lotado' });
      }
    }

    // Create enrollment (handle re-enrollment)
    const enrollmentData: Omit<WorkshopEnrollment, 'id'> = {
      workshopId,
      userId: uid,
      userName: userData?.name || 'Usuário',
      userEmail: userData?.email || '',
      enrolledAt: new Date(),
      status: 'enrolled'
    };

    const batch = db.batch();

    if (existingEnrollmentDoc && existingEnrollmentData?.status === 'cancelled') {
      // Update existing cancelled enrollment instead of creating new one
      batch.update(existingEnrollmentDoc.ref, {
        ...enrollmentData,
        previousStatus: existingEnrollmentData.status,
        reEnrolledAt: new Date(),
        cancelledAt: admin.firestore.FieldValue.delete()
      });

      // Update workshop enrolled count
      const workshopRef = db.collection('workshops').doc(workshopId);
      batch.update(workshopRef, {
        enrolledCount: admin.firestore.FieldValue.increment(1)
      });

      // Add enrollment XP
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, {
        engagement_xp: admin.firestore.FieldValue.increment(10)
      });

      await batch.commit();

      // Update workshop object with new enrolled count for response
      workshop.enrolledCount = (workshopData.enrolledCount || 0) + 1;

      // 🔧 Send enrollment confirmation with try-catch for better error handling
      try {
        await WorkshopNotificationService.sendEnrollmentConfirmation(
          uid,
          workshop,
          { id: existingEnrollmentDoc.id, ...enrollmentData }
        );
      } catch (notificationError) {
        console.error('Erro ao enviar confirmação de inscrição:', notificationError);
        // Don't fail the enrollment if notification fails
      }

      res.status(201).json({
        message: 'Inscrição realizada com sucesso!',
        workshop: workshop,
        enrollment: { 
          id: existingEnrollmentDoc.id, 
          ...enrollmentData,
          previousStatus: existingEnrollmentData.status,
          isReEnrollment: true
        },
        xpAwarded: 10
      });

    } else {
      // Create new enrollment document
      const enrollmentRef = db.collection('workshop_enrollments').doc();
      batch.set(enrollmentRef, enrollmentData);

      // Update workshop enrolled count
      const workshopRef = db.collection('workshops').doc(workshopId);
      batch.update(workshopRef, {
        enrolledCount: admin.firestore.FieldValue.increment(1)
      });

      // Add enrollment XP
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, {
        engagement_xp: admin.firestore.FieldValue.increment(10)
      });

      await batch.commit();

      // Update workshop object with new enrolled count for response
      workshop.enrolledCount = (workshopData.enrolledCount || 0) + 1;

      // 🔧 Send enrollment confirmation with try-catch for better error handling
      try {
        await WorkshopNotificationService.sendEnrollmentConfirmation(
          uid,
          workshop,
          { id: enrollmentRef.id, ...enrollmentData }
        );
      } catch (notificationError) {
        console.error('Erro ao enviar confirmação de inscrição:', notificationError);
        // Don't fail the enrollment if notification fails
      }

      res.status(201).json({
        message: 'Inscrição realizada com sucesso!',
        workshop: workshop,
        enrollment: { id: enrollmentRef.id, ...enrollmentData },
        xpAwarded: 10
      });
    }

  } catch (error) {
    console.error('Erro ao inscrever no workshop:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
  // Cancel enrollment
  static async cancelEnrollment(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;

      const enrollmentSnapshot = await db.collection('workshop_enrollments')
        .where('workshopId', '==', workshopId)
        .where('userId', '==', uid)
        .get();

      if (enrollmentSnapshot.empty) {
        return res.status(404).json({ error: 'Inscrição não encontrada' });
      }

      const enrollmentDoc = enrollmentSnapshot.docs[0];
      const enrollmentData = enrollmentDoc.data();

      if (enrollmentData.status === 'cancelled') {
        return res.status(400).json({ error: 'Inscrição já foi cancelada' });
      }

      if (enrollmentData.status === 'completed') {
        return res.status(400).json({ error: 'Não é possível cancelar workshop já concluído' });
      }

      const batch = db.batch();

      // Update enrollment status
      batch.update(enrollmentDoc.ref, {
        status: 'cancelled',
        cancelledAt: new Date()
      });

      // Decrease workshop enrolled count (only if was enrolled, not waitlisted)
      if (enrollmentData.status === 'enrolled') {
        const workshopRef = db.collection('workshops').doc(workshopId);
        batch.update(workshopRef, {
          enrolledCount: admin.firestore.FieldValue.increment(-1)
        });
      }

      await batch.commit();

      res.json({ message: 'Inscrição cancelada com sucesso!' });

    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Mark workshop as completed and award XP + certificate
  static async completeWorkshop(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;
      const { feedback } = req.body;

      // Get enrollment
      const enrollmentSnapshot = await db.collection('workshop_enrollments')
        .where('workshopId', '==', workshopId)
        .where('userId', '==', uid)
        .get();

      if (enrollmentSnapshot.empty) {
        return res.status(404).json({ error: 'Inscrição não encontrada' });
      }

      const enrollmentDoc = enrollmentSnapshot.docs[0];
      const enrollmentData = enrollmentDoc.data();

      if (enrollmentData.status === 'completed') {
        return res.status(400).json({ error: 'Workshop já foi concluído' });
      }

      if (enrollmentData.status !== 'attended' && enrollmentData.status !== 'enrolled') {
        return res.status(400).json({ error: 'Usuário não participou do workshop' });
      }

      const workshopDoc = await db.collection('workshops').doc(workshopId).get();
      const workshopData = workshopDoc.data();

      const batch = db.batch();

      // Update enrollment status
      const enrollmentUpdate: any = {
        status: 'completed',
        completedAt: new Date()
      };

      if (feedback) {
        enrollmentUpdate.feedback = {
          ...feedback,
          submittedAt: new Date()
        };
      }

      batch.update(enrollmentDoc.ref, enrollmentUpdate);

      // Award 200 XP to user
      const userRef = db.collection('users').doc(uid);
      batch.update(userRef, {
        engagement_xp: admin.firestore.FieldValue.increment(200),
        'stats.workshopsCompleted': admin.firestore.FieldValue.increment(1)
      });

      // Update workshop completed count
      batch.update(db.collection('workshops').doc(workshopId), {
        completedCount: admin.firestore.FieldValue.increment(1)
      });

      await batch.commit();

      let certificate = null;

      // Generate certificate if enabled
      if (workshopData?.autoGenerateCertificate) {
        try {
          certificate = await CertificateService.generateCertificate({
            workshopId,
            workshopTitle: workshopData.title,
            userId: uid,
            userName: enrollmentData.userName,
            completedAt: new Date(),
            creatorName: workshopData.creatorName,
            duration: workshopData.duration
          });

          // Update enrollment with certificate info
          await enrollmentDoc.ref.update({
            certificateIssued: true,
            certificateId: certificate.id
          });
        } catch (certError) {
          console.error('Erro ao gerar certificado:', certError);
          // Don't fail the completion if certificate generation fails
        }
      }

      // Send completion notification
      await WorkshopNotificationService.sendCompletionNotification(
        uid,
        { ...(workshopData as any), id: workshopId },
        200,
        certificate?.id
      );

      res.status(200).json({
        message: 'Workshop concluído com sucesso!',
        xpAwarded: 200,
        certificate,
        feedback: feedback ? 'Feedback registrado' : null
      });

    } catch (error) {
      console.error('Erro ao concluir workshop:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Get user's workshop enrollments
  static async getUserEnrollments(req: Request, res: Response) {
    try {
      const { uid } = req.params;
      const { status = 'all', limit = 20 } = req.query;

      let query = db.collection('workshop_enrollments').where('userId', '==', uid);
      
      if (status !== 'all') {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('enrolledAt', 'desc').limit(Number(limit));

      const enrollments = await query.get();
      
      const workshops = await Promise.all(
        enrollments.docs.map(async (doc) => {
          const enrollmentData = doc.data();
          const workshopDoc = await db.collection('workshops').doc(enrollmentData.workshopId).get();
          const workshopData = workshopDoc.data();

          return {
            enrollmentId: doc.id,
            workshop: { 
              id: workshopDoc.id, 
              ...workshopData,
              scheduledDate: workshopData?.scheduledDate?.toDate?.() || workshopData?.scheduledDate
            },
            enrollment: {
              ...enrollmentData,
              enrolledAt: enrollmentData.enrolledAt?.toDate?.() || enrollmentData.enrolledAt,
              completedAt: enrollmentData.completedAt?.toDate?.() || enrollmentData.completedAt
            }
          };
        })
      );

      res.json({ workshops });

    } catch (error) {
      console.error('Erro ao buscar inscrições do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Get workshop participants (for creators)
  static async getWorkshopParticipants(req: Request, res: Response) {
    try {
      const { workshopId, uid } = req.params;
      const { status = 'all' } = req.query;

      // Verify workshop exists and user is the creator
      const workshopDoc = await db.collection('workshops').doc(workshopId).get();
      if (!workshopDoc.exists) {
        return res.status(404).json({ error: 'Workshop não encontrado' });
      }

      const workshopData = workshopDoc.data();
      if (workshopData?.creatorId !== uid) {
        return res.status(403).json({ 
          error: 'Apenas o criador pode ver os participantes' 
        });
      }

      let query = db.collection('workshop_enrollments')
        .where('workshopId', '==', workshopId);

      if (status !== 'all') {
        query = query.where('status', '==', status);
      }

      query = query.orderBy('enrolledAt', 'desc');

      const snapshot = await query.get();
      const participants = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          status: data.status,
          enrolledAt: data.enrolledAt?.toDate?.() || data.enrolledAt,
          completedAt: data.completedAt?.toDate?.() || data.completedAt
        };
      });

      res.json({ 
        participants,
        summary: {
          total: participants.length,
          enrolled: participants.filter(p => p.status === 'enrolled').length,
          completed: participants.filter(p => p.status === 'completed').length,
          waitlisted: participants.filter(p => p.status === 'waitlisted').length
        }
      });

    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}