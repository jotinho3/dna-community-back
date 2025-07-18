import { Firestore } from '@google-cloud/firestore';

export interface DailyQuest {
  id: string;
  title: string;
  description: string;
  quest_type: string;
  created_at: Date;
  xp_reward: number;
}

const firestore = new Firestore();

export const createDailyQuest = async (dailyQuest: DailyQuest) => {
  const docRef = firestore.collection('dailyQuests').doc(dailyQuest.id);
  await docRef.set(dailyQuest);
  return docRef.id;
};

export const getDailyQuest = async (id: string) => {
  const docRef = firestore.collection('dailyQuests').doc(id);
  const doc = await docRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateDailyQuest = async (id: string, dailyQuest: Partial<DailyQuest>) => {
  const docRef = firestore.collection('dailyQuests').doc(id);
  await docRef.update(dailyQuest);
};

export const deleteDailyQuest = async (id: string) => {
  const docRef = firestore.collection('dailyQuests').doc(id);
  await docRef.delete();
};