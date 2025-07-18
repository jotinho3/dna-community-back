import { Firestore } from '@google-cloud/firestore';

export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  preferred_languages: string[];
  preferred_softwares: string[];
  engagement_xp: number;
  subcompanyId?: string;
  created_at: Date;

  profile?: Profile;
  subcompany?: Subcompany;

  News?: News[];
  WorkshopsCreated?: Workshop[];
  UserWorkshops?: UserWorkshop[];
  ForumsCreated?: Forum[];
  Posts?: Post[];
  Responses?: Response[];
  Reactions?: Reaction[];
  FollowsFollowed?: Follow[];
  FollowsFollower?: Follow[];
  Notifications?: Notification[];
  UserDailyQuests?: UserDailyQuest[];
  Certifications?: Certification[];
}

const firestore = new Firestore();

export const createUser = async (user: User) => {
  const userRef = firestore.collection('users').doc(user.id);
  await userRef.set(user);
};

export const getUser = async (id: string): Promise<User | null> => {
  const userRef = firestore.collection('users').doc(id);
  const doc = await userRef.get();
  return doc.exists ? (doc.data() as User) : null;
};

// Additional CRUD operations can be added here as needed.