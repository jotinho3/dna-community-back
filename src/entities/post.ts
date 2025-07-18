import { Firestore } from '@google-cloud/firestore';

export interface Post {
  id: string;
  forumId: string;
  authorId: string;
  content: string;
  created_at: Date;
}

const firestore = new Firestore();

export const createPost = async (post: Post) => {
  const postRef = firestore.collection('posts').doc(post.id);
  await postRef.set(post);
  return postRef.id;
};

export const getPost = async (id: string) => {
  const postRef = firestore.collection('posts').doc(id);
  const doc = await postRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updatePost = async (id: string, updatedData: Partial<Post>) => {
  const postRef = firestore.collection('posts').doc(id);
  await postRef.update(updatedData);
};

export const deletePost = async (id: string) => {
  const postRef = firestore.collection('posts').doc(id);
  await postRef.delete();
};