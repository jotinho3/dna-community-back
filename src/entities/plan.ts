import { Firestore } from '@google-cloud/firestore';

export interface Plan {
  id: string;
  name: string;
  user_limit_per_subcompany: number;
  features: string[];
  price: number;
}

const firestore = new Firestore();

export const createPlan = async (plan: Plan) => {
  const planRef = firestore.collection('plans').doc(plan.id);
  await planRef.set(plan);
  return planRef;
};

export const getPlan = async (id: string) => {
  const planRef = firestore.collection('plans').doc(id);
  const doc = await planRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updatePlan = async (id: string, updatedPlan: Partial<Plan>) => {
  const planRef = firestore.collection('plans').doc(id);
  await planRef.update(updatedPlan);
  return planRef;
};

export const deletePlan = async (id: string) => {
  const planRef = firestore.collection('plans').doc(id);
  await planRef.delete();
};