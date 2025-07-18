import { Firestore } from '@google-cloud/firestore';

export interface Workshop {
  id: string;
  title: string;
  description: string;
  date: Date;
  createdBy: string;
}

const firestore = new Firestore();

export const createWorkshop = async (workshop: Workshop) => {
  const workshopRef = firestore.collection('workshops').doc(workshop.id);
  await workshopRef.set(workshop);
  return workshopRef;
};

export const getWorkshop = async (id: string) => {
  const workshopRef = firestore.collection('workshops').doc(id);
  const workshopDoc = await workshopRef.get();
  return workshopDoc.exists ? workshopDoc.data() : null;
};

export const updateWorkshop = async (id: string, workshop: Partial<Workshop>) => {
  const workshopRef = firestore.collection('workshops').doc(id);
  await workshopRef.update(workshop);
  return workshopRef;
};

export const deleteWorkshop = async (id: string) => {
  const workshopRef = firestore.collection('workshops').doc(id);
  await workshopRef.delete();
};