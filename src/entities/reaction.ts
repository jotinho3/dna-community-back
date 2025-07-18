import { Firestore } from '@google-cloud/firestore';

export interface Reaction {
  id: string;
  userId: string;
  postId?: string;
  responseId?: string;
  type: string;
  created_at: Date;
}

export class ReactionEntity {
  private firestore: Firestore;
  private collectionName: string = 'reactions';

  constructor() {
    this.firestore = new Firestore();
  }

  async createReaction(reaction: Reaction): Promise<Reaction> {
    const reactionRef = this.firestore.collection(this.collectionName).doc(reaction.id);
    await reactionRef.set(reaction);
    return reaction;
  }

  async getReaction(id: string): Promise<Reaction | null> {
    const reactionRef = this.firestore.collection(this.collectionName).doc(id);
    const doc = await reactionRef.get();
    return doc.exists ? (doc.data() as Reaction) : null;
  }

  async updateReaction(id: string, reaction: Partial<Reaction>): Promise<void> {
    const reactionRef = this.firestore.collection(this.collectionName).doc(id);
    await reactionRef.update(reaction);
  }

  async deleteReaction(id: string): Promise<void> {
    const reactionRef = this.firestore.collection(this.collectionName).doc(id);
    await reactionRef.delete();
  }

  async getAllReactions(): Promise<Reaction[]> {
    const snapshot = await this.firestore.collection(this.collectionName).get();
    return snapshot.docs.map(doc => doc.data() as Reaction);
  }
}