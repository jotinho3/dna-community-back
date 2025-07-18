import { firestore } from '../utils/firebase';

export interface UserWorkshop {
  id: string;
  userId: string;
  workshopId: string;
  completed_at: Date | null;
  xp_earned: number;
}

export const createUserWorkshop = async (userWorkshop: UserWorkshop) => {
  const userWorkshopRef = firestore.collection('userWorkshops').doc(userWorkshop.id);
  await userWorkshopRef.set(userWorkshop);
  return userWorkshopRef;
};

export const getUserWorkshop = async (id: string) => {
  const userWorkshopRef = firestore.collection('userWorkshops').doc(id);
  const doc = await userWorkshopRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateUserWorkshop = async (id: string, userWorkshop: Partial<UserWorkshop>) => {
  const userWorkshopRef = firestore.collection('userWorkshops').doc(id);
  await userWorkshopRef.update(userWorkshop);
  return userWorkshopRef;
};

export const deleteUserWorkshop = async (id: string) => {
  const userWorkshopRef = firestore.collection('userWorkshops').doc(id);
  await userWorkshopRef.delete();
  return id;
};