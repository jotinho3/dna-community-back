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
      await db.collection('notifications').add({
        userId,
        type: 'workshop_enrollment',
        fromUserId: 'system',
        fromUserName: 'Sistema DNA Community',
        targetId: workshop.id,
        targetType: 'workshop',
        message: `Inscrição confirmada no workshop "${workshop.title}" - ${new Date(workshop.scheduledDate).toLocaleDateString('pt-BR')}`,
        createdAt: new Date(),
        read: false,
        metadata: {
          workshopId: workshop.id,
          workshopTitle: workshop.title,
          scheduledDate: workshop.scheduledDate,
          meetingLink: workshop.meetingLink
        }
      });
    } catch (error) {
      console.error('Erro ao enviar confirmação de inscrição:', error);
    }
  }

  // Send workshop reminder (1 day before)
  static async sendWorkshopReminder(
    userId: string, 
    workshop: Workshop
  ): Promise<void> {
    try {
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
          scheduledDate: workshop.scheduledDate,
          meetingLink: workshop.meetingLink,
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
          meetingLink: workshop.meetingLink,
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
}