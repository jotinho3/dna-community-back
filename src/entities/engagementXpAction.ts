import { firestore } from '../utils/firebase';

export interface EngagementXpAction {
  id: string;
  action: string;
  xp_amount: number;
}

export const createEngagementXpAction = async (data: EngagementXpAction) => {
  const docRef = firestore.collection('engagementXpActions').doc(data.id);
  await docRef.set(data);
  return docRef;
};

export const getEngagementXpAction = async (id: string) => {
  const docRef = firestore.collection('engagementXpActions').doc(id);
  const doc = await docRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateEngagementXpAction = async (id: string, data: Partial<EngagementXpAction>) => {
  const docRef = firestore.collection('engagementXpActions').doc(id);
  await docRef.update(data);
  return docRef;
};

export const deleteEngagementXpAction = async (id: string) => {
  const docRef = firestore.collection('engagementXpActions').doc(id);
  await docRef.delete();
  return id;
};