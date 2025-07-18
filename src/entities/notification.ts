import { Firestore } from 'firebase-admin/firestore';

export interface Notification {
  id: string;
  userId: string;
  type: string;
  relatedPostId?: string;
  relatedResponseId?: string;
  relatedWorkshopId?: string;
  relatedQuestId?: string;
  created_at: Date;
  read: boolean;
}

export class NotificationEntity {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async create(notification: Notification): Promise<void> {
    await this.db.collection('notifications').doc(notification.id).set(notification);
  }

  async getById(id: string): Promise<Notification | null> {
    const doc = await this.db.collection('notifications').doc(id).get();
    return doc.exists ? (doc.data() as Notification) : null;
  }

  async update(id: string, updates: Partial<Notification>): Promise<void> {
    await this.db.collection('notifications').doc(id).update(updates);
  }

  async delete(id: string): Promise<void> {
    await this.db.collection('notifications').doc(id).delete();
  }

  async getAllByUserId(userId: string): Promise<Notification[]> {
    const snapshot = await this.db.collection('notifications').where('userId', '==', userId).get();
    return snapshot.docs.map(doc => doc.data() as Notification);
  }
}