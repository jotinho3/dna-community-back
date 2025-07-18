import { Firestore } from 'firebase-admin/firestore';

export interface Follow {
  id: string;
  followerId: string;
  followedId: string;
  created_at: Date;
}

export class FollowEntity {
  private db: Firestore;

  constructor(db: Firestore) {
    this.db = db;
  }

  async createFollow(followerId: string, followedId: string): Promise<Follow> {
    const follow: Follow = {
      id: this.db.collection('follows').doc().id,
      followerId,
      followedId,
      created_at: new Date(),
    };

    await this.db.collection('follows').doc(follow.id).set(follow);
    return follow;
  }

  async getFollowsByUser(userId: string): Promise<Follow[]> {
    const snapshot = await this.db.collection('follows').where('followerId', '==', userId).get();
    return snapshot.docs.map(doc => doc.data() as Follow);
  }

  async deleteFollow(followId: string): Promise<void> {
    await this.db.collection('follows').doc(followId).delete();
  }
}