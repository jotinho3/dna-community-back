import { db } from '../utils/firebase';
import { Workshop, WorkshopEnrollment } from '../types/workshops';

export class WorkshopNotificationService {
  
  // Send enrollment confirmation
static async sendEnrollmentConfirmation(
    userId: string, 
    workshop: Workshop, 
    enrollment: WorkshopEnrollment
  ): Promise<void> {
    try {
      // 🔧 Use the helper method for date validation
      const validScheduledDate = this.validateDate(workshop.scheduledDate);

      console.log('📅 Date validation in notification service:', {
        original: workshop.scheduledDate,
        validated: validScheduledDate,
        isValid: !isNaN(validScheduledDate.getTime())
      });

      // 🔧 Create notification data with validated dates
      const notificationData = {
        userId,
        type: 'workshop_enrollment',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: workshop.id,
        targetType: 'workshop',
        message: `Inscrição confirmada no workshop "${workshop.title}" - ${validScheduledDate.toLocaleDateString('pt-BR')}`,
        createdAt: new Date(),
        read: false,
        metadata: {
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          scheduledDate: validScheduledDate, // 🔧 Use validated date
          startTime: workshop.startTime || '',
          endTime: workshop.endTime || '',
          timezone: workshop.timezone || 'America/Sao_Paulo',
          meetingLink: workshop.meetingLink || '',
          enrollmentId: enrollment.id
        }
      };

      console.log('📤 Sending notification with data:', {
        userId: notificationData.userId,
        type: notificationData.type,
        scheduledDate: notificationData.metadata.scheduledDate,
        isValidDate: !isNaN(notificationData.metadata.scheduledDate.getTime())
      });

      await db.collection('notifications').add(notificationData);
      
      console.log('✅ Enrollment confirmation notification sent successfully');

    } catch (error) {
      console.error('❌ Erro ao enviar confirmação de inscrição:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        userId,
        workshopId: workshop.id,
        workshopTitle: workshop.title,
        scheduledDate: workshop.scheduledDate
      });
      throw error; // Re-throw to be caught by the calling function
    }
  }
  // Send workshop reminder (1 day before)
  static async sendWorkshopReminder(
    userId: string, 
    workshop: Workshop
  ): Promise<void> {
    try {
      // 🔧 Use validated date
      const validScheduledDate = this.validateDate(workshop.scheduledDate);

      await db.collection('notifications').add({
        userId,
        type: 'workshop_reminder',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: workshop.id,
        targetType: 'workshop',
        message: `Lembrete: Workshop "${workshop.title}" acontece amanhã às ${workshop.startTime}`,
        createdAt: new Date(),
        read: false,
        metadata: {
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          scheduledDate: validScheduledDate, // 🔧 Use validated date
          meetingLink: workshop.meetingLink || '',
          reminderType: 'day_before'
        }
      });
    } catch (error) {
      console.error('Erro ao enviar lembrete de workshop:', error);
    }
  }

  // Send workshop starting soon (1 hour before)
  static async sendWorkshopStartingSoon(
    userId: string, 
    workshop: Workshop
  ): Promise<void> {
    try {
      // 🔧 Use validated date
      const validScheduledDate = this.validateDate(workshop.scheduledDate);

      await db.collection('notifications').add({
        userId,
        type: 'workshop_starting',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: workshop.id,
        targetType: 'workshop',
        message: `O workshop "${workshop.title}" começará em 1 hora! Link: ${workshop.meetingLink}`,
        createdAt: new Date(),
        read: false,
        metadata: {
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          scheduledDate: validScheduledDate, // 🔧 Use validated date
          meetingLink: workshop.meetingLink || '',
          reminderType: 'hour_before'
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de início iminente:', error);
    }
  }


  // Send completion notification with certificate
 static async sendCompletionNotification(
    userId: string, 
    workshop: Workshop, 
    xpAwarded: number,
    certificateId?: string
  ): Promise<void> {
    try {
      // 🔧 Use validated date
      const validScheduledDate = this.validateDate(workshop.scheduledDate);

      const message = certificateId 
        ? `Parabéns! Você concluiu o workshop "${workshop.title}" e ganhou ${xpAwarded} XP! Seu certificado está pronto.`
        : `Parabéns! Você concluiu o workshop "${workshop.title}" e ganhou ${xpAwarded} XP!`;

      await db.collection('notifications').add({
        userId,
        type: 'workshop_completed',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: workshop.id,
        targetType: 'workshop',
        message,
        createdAt: new Date(),
        read: false,
        metadata: {
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          scheduledDate: validScheduledDate, // 🔧 Use validated date
          xpAwarded,
          certificateId
        }
      });
    } catch (error) {
      console.error('Erro ao enviar notificação de conclusão:', error);
    }
  }

  // Send workshop cancellation
 static async sendWorkshopCancellation(
    userIds: string[], 
    workshop: Workshop, 
    reason?: string
  ): Promise<void> {
    try {
      // 🔧 Use validated date
      const validScheduledDate = this.validateDate(workshop.scheduledDate);

      const batch = db.batch();
      
      userIds.forEach(userId => {
        const notificationRef = db.collection('notifications').doc();
        batch.set(notificationRef, {
          userId,
          type: 'workshop_cancelled',
          fromUserId: 'system',
          fromUserName: 'Sistema DNA Community',
          targetId: workshop.id,
          targetType: 'workshop',
          message: `O workshop "${workshop.title}" foi cancelado.${reason ? ` Motivo: ${reason}` : ''}`,
          createdAt: new Date(),
          read: false,
          metadata: {
            workshopId: workshop.id,
            workshopTitle: workshop.title,
            scheduledDate: validScheduledDate, // 🔧 Use validated date
            reason
          }
        });
      });

      await batch.commit();
    } catch (error) {
      console.error('Erro ao enviar notificações de cancelamento:', error);
    }
  }

  // Schedule reminders for a workshop
  static async scheduleWorkshopReminders(workshop: Workshop): Promise<void> {
    try {
      // Get all enrolled users
      const enrollmentsSnapshot = await db.collection('workshop_enrollments')
        .where('workshopId', '==', workshop.id)
        .where('status', '==', 'enrolled')
        .get();

      const enrolledUserIds = enrollmentsSnapshot.docs.map(doc => doc.data().userId);

      // TODO: Implement actual scheduling (using cron jobs, cloud functions, etc.)
      // For now, just log the intention
      console.log(`Scheduling reminders for workshop ${workshop.id} for ${enrolledUserIds.length} users`);
      
      // You would typically:
      // 1. Schedule a job for 24 hours before workshop
      // 2. Schedule a job for 1 hour before workshop
      // 3. Use Firebase Cloud Functions with scheduled triggers
      
    } catch (error) {
      console.error('Erro ao agendar lembretes:', error);
    }
  }

  private static validateDate(date: any): Date {
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    } else if (date && typeof date.toDate === 'function') {
      const converted = date.toDate();
      return !isNaN(converted.getTime()) ? converted : new Date();
    } else if (typeof date === 'string') {
      const parsed = new Date(date);
      return !isNaN(parsed.getTime()) ? parsed : new Date();
    } else {
      console.warn('Invalid date format, using current date as fallback:', date);
      return new Date();
    }
  }

}