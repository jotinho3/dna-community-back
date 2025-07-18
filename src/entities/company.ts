import { Firestore } from '@google-cloud/firestore';

export class Company {
  id: string;
  name: string;
  planId?: string;

  constructor(data: any) {
    this.id = data.id || '';
    this.name = data.name || '';
    this.planId = data.planId || null;
  }

  static async create(data: any): Promise<Company> {
    const firestore = new Firestore();
    const companyRef = firestore.collection('companies').doc();
    const company = new Company({ ...data, id: companyRef.id });
    await companyRef.set(company);
    return company;
  }

  static async getById(id: string): Promise<Company | null> {
    const firestore = new Firestore();
    const companyRef = firestore.collection('companies').doc(id);
    const doc = await companyRef.get();
    return doc.exists ? new Company({ id: doc.id, ...doc.data() }) : null;
  }

  static async update(id: string, data: any): Promise<Company | null> {
    const firestore = new Firestore();
    const companyRef = firestore.collection('companies').doc(id);
    await companyRef.update(data);
    const updatedDoc = await companyRef.get();
    return updatedDoc.exists ? new Company({ id: updatedDoc.id, ...updatedDoc.data() }) : null;
  }

  static async delete(id: string): Promise<void> {
    const firestore = new Firestore();
    const companyRef = firestore.collection('companies').doc(id);
    await companyRef.delete();
  }
}