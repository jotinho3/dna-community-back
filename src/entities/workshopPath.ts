import { firestore } from '../utils/firebase';

export interface WorkshopPath {
  id: string;
  name: string;
  description: string;
}

export const createWorkshopPath = async (workshopPath: WorkshopPath) => {
  const workshopPathRef = firestore.collection('workshopPaths').doc(workshopPath.id);
  await workshopPathRef.set(workshopPath);
  return workshopPathRef;
};

export const getWorkshopPath = async (id: string) => {
  const workshopPathRef = firestore.collection('workshopPaths').doc(id);
  const doc = await workshopPathRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateWorkshopPath = async (id: string, workshopPath: Partial<WorkshopPath>) => {
  const workshopPathRef = firestore.collection('workshopPaths').doc(id);
  await workshopPathRef.update(workshopPath);
  return workshopPathRef;
};

export const deleteWorkshopPath = async (id: string) => {
  const workshopPathRef = firestore.collection('workshopPaths').doc(id);
  await workshopPathRef.delete();
};