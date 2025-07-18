import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

export interface Subcompany {
  id: string;
  name: string;
  companyId: string;
  user_limit: number;
}

export const createSubcompany = async (subcompany: Subcompany) => {
  const subcompanyRef = firestore.collection('subcompanies').doc(subcompany.id);
  await subcompanyRef.set(subcompany);
  return subcompanyRef.id;
};

export const getSubcompany = async (id: string) => {
  const subcompanyRef = firestore.collection('subcompanies').doc(id);
  const doc = await subcompanyRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateSubcompany = async (id: string, data: Partial<Subcompany>) => {
  const subcompanyRef = firestore.collection('subcompanies').doc(id);
  await subcompanyRef.update(data);
};

export const deleteSubcompany = async (id: string) => {
  const subcompanyRef = firestore.collection('subcompanies').doc(id);
  await subcompanyRef.delete();
};

export const getAllSubcompanies = async () => {
  const snapshot = await firestore.collection('subcompanies').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};