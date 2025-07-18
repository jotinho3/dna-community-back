import { Firestore } from 'firebase-admin/firestore';

export interface WorkshopPathStep {
  id: string;
  workshopPathId: string;
  workshopId: string;
  order: number;
}

export class WorkshopPathStepService {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async createWorkshopPathStep(workshopPathStep: WorkshopPathStep): Promise<void> {
    await this.db.collection('workshopPathSteps').doc(workshopPathStep.id).set(workshopPathStep);
  }

  async getWorkshopPathStep(id: string): Promise<WorkshopPathStep | null> {
    const doc = await this.db.collection('workshopPathSteps').doc(id).get();
    return doc.exists ? (doc.data() as WorkshopPathStep) : null;
  }

  async updateWorkshopPathStep(id: string, workshopPathStep: Partial<WorkshopPathStep>): Promise<void> {
    await this.db.collection('workshopPathSteps').doc(id).update(workshopPathStep);
  }

  async deleteWorkshopPathStep(id: string): Promise<void> {
    await this.db.collection('workshopPathSteps').doc(id).delete();
  }

  async getAllWorkshopPathSteps(): Promise<WorkshopPathStep[]> {
    const snapshot = await this.db.collection('workshopPathSteps').get();
    return snapshot.docs.map(doc => doc.data() as WorkshopPathStep);
  }
}