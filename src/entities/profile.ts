import { Firestore } from '@google-cloud/firestore';

export interface Profile {
  id: string;
  bio: string;
  avatar_url: string;
  location: string;
  userId: string;
}

const firestore = new Firestore();

export const createProfile = async (profile: Profile) => {
  const profileRef = firestore.collection('profiles').doc(profile.id);
  await profileRef.set(profile);
};

export const getProfile = async (id: string): Promise<Profile | null> => {
  const profileRef = firestore.collection('profiles').doc(id);
  const doc = await profileRef.get();
  return doc.exists ? (doc.data() as Profile) : null;
};

export const updateProfile = async (id: string, profile: Partial<Profile>) => {
  const profileRef = firestore.collection('profiles').doc(id);
  await profileRef.update(profile);
};

export const deleteProfile = async (id: string) => {
  const profileRef = firestore.collection('profiles').doc(id);
  await profileRef.delete();
};