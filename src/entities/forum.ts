import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

export interface Forum {
  id: string;
  title: string;
  description: string;
  created_at: Date;
  createdBy: string;
}

export const createForum = async (forum: Forum) => {
  const forumRef = firestore.collection('forums').doc(forum.id);
  await forumRef.set(forum);
  return forumRef;
};

export const getForum = async (id: string) => {
  const forumRef = firestore.collection('forums').doc(id);
  const forumDoc = await forumRef.get();
  if (!forumDoc.exists) {
    throw new Error('Forum not found');
  }
  return forumDoc.data() as Forum;
};

export const updateForum = async (id: string, updatedData: Partial<Forum>) => {
  const forumRef = firestore.collection('forums').doc(id);
  await forumRef.update(updatedData);
  return forumRef;
};

export const deleteForum = async (id: string) => {
  const forumRef = firestore.collection('forums').doc(id);
  await forumRef.delete();
};