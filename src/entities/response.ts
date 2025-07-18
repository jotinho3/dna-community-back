import { Firestore } from '@google-cloud/firestore';

export interface Response {
  id: string;
  postId: string;
  authorId: string;
  content: string;
  created_at: Date;
  parentResponseId?: string;
}

export class ResponseEntity {
  private firestore: Firestore;

  constructor() {
    this.firestore = new Firestore();
  }

  async createResponse(response: Response): Promise<Response> {
    const responseRef = this.firestore.collection('responses').doc(response.id);
    await responseRef.set(response);
    return response;
  }

  async getResponse(id: string): Promise<Response | null> {
    const responseRef = this.firestore.collection('responses').doc(id);
    const doc = await responseRef.get();
    return doc.exists ? (doc.data() as Response) : null;
  }

  async updateResponse(id: string, updatedData: Partial<Response>): Promise<Response | null> {
    const responseRef = this.firestore.collection('responses').doc(id);
    await responseRef.update(updatedData);
    const updatedDoc = await responseRef.get();
    return updatedDoc.exists ? (updatedDoc.data() as Response) : null;
  }

  async deleteResponse(id: string): Promise<void> {
    const responseRef = this.firestore.collection('responses').doc(id);
    await responseRef.delete();
  }

  async getResponsesByPostId(postId: string): Promise<Response[]> {
    const responsesRef = this.firestore.collection('responses');
    const snapshot = await responsesRef.where('postId', '==', postId).get();
    return snapshot.docs.map(doc => doc.data() as Response);
  }
}