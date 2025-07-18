import { Firestore } from '@google-cloud/firestore';

const firestore = new Firestore();

export interface News {
  id: string;
  title: string;
  content: string;
  created_at: Date;
  authorId: string;
}

export const createNews = async (news: News) => {
  const newsRef = firestore.collection('news').doc(news.id);
  await newsRef.set(news);
  return newsRef.id;
};

export const getNews = async (id: string) => {
  const newsRef = firestore.collection('news').doc(id);
  const doc = await newsRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateNews = async (id: string, updatedData: Partial<News>) => {
  const newsRef = firestore.collection('news').doc(id);
  await newsRef.update(updatedData);
  return newsRef.id;
};

export const deleteNews = async (id: string) => {
  const newsRef = firestore.collection('news').doc(id);
  await newsRef.delete();
};