import { Firestore } from '@google-cloud/firestore';

export interface UserDailyQuest {
  id: string;
  userId: string;
  questId: string;
  completed_at: Date | null;
  xp_earned: number;
}

export class UserDailyQuestEntity {
  private firestore: Firestore;
  private collectionName: string = 'userDailyQuests';

  constructor(firestore: Firestore) {
    this.firestore = firestore;
  }

  async create(userDailyQuest: UserDailyQuest): Promise<UserDailyQuest> {
    const docRef = this.firestore.collection(this.collectionName).doc(userDailyQuest.id);
    await docRef.set(userDailyQuest);
    return userDailyQuest;
  }

  async getById(id: string): Promise<UserDailyQuest | null> {
    const doc = await this.firestore.collection(this.collectionName).doc(id).get();
    return doc.exists ? (doc.data() as UserDailyQuest) : null;
  }

  async update(id: string, userDailyQuest: Partial<UserDailyQuest>): Promise<UserDailyQuest | null> {
    const docRef = this.firestore.collection(this.collectionName).doc(id);
    await docRef.update(userDailyQuest);
    return this.getById(id);
  }

  async delete(id: string): Promise<void> {
    await this.firestore.collection(this.collectionName).doc(id).delete();
  }

  async getAll(): Promise<UserDailyQuest[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDailyQuest));
  }
}