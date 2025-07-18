import { firestore } from '../utils/firebase';
import { User } from '../entities/user';
import { Profile } from '../entities/profile';
import { Company } from '../entities/company';
import { Plan } from '../entities/plan';
import { Subcompany } from '../entities/subcompany';
import { News } from '../entities/news';
import { Workshop } from '../entities/workshop';
import { UserWorkshop } from '../entities/userWorkshop';
import { Forum } from '../entities/forum';
import { Post } from '../entities/post';
import { Response } from '../entities/response';
import { Reaction } from '../entities/reaction';
import { Follow } from '../entities/follow';
import { Notification } from '../entities/notification';
import { DailyQuest } from '../entities/dailyQuest';
import { UserDailyQuest } from '../entities/userDailyQuest';
import { EngagementXpAction } from '../entities/engagementXpAction';
import { WorkshopPath } from '../entities/workshopPath';
import { WorkshopPathStep } from '../entities/workshopPathStep';
import { Certification } from '../entities/certification';

// User Service
export const userService = {
  createUser: async (userData: User) => {
    const userRef = firestore.collection('users').doc(userData.id);
    await userRef.set(userData);
    return userRef;
  },
  getUser: async (id: string) => {
    const userRef = firestore.collection('users').doc(id);
    const userDoc = await userRef.get();
    return userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
  },
  // Additional user service methods...
};

// Profile Service
export const profileService = {
  createProfile: async (profileData: Profile) => {
    const profileRef = firestore.collection('profiles').doc(profileData.id);
    await profileRef.set(profileData);
    return profileRef;
  },
  getProfile: async (userId: string) => {
    const profileRef = firestore.collection('profiles').where('userId', '==', userId);
    const profileSnapshot = await profileRef.get();
    return profileSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  },
  // Additional profile service methods...
};

// Company Service
export const companyService = {
  createCompany: async (companyData: Company) => {
    const companyRef = firestore.collection('companies').doc(companyData.id);
    await companyRef.set(companyData);
    return companyRef;
  },
  getCompany: async (id: string) => {
    const companyRef = firestore.collection('companies').doc(id);
    const companyDoc = await companyRef.get();
    return companyDoc.exists ? { id: companyDoc.id, ...companyDoc.data() } : null;
  },
  // Additional company service methods...
};

// Plan Service
export const planService = {
  createPlan: async (planData: Plan) => {
    const planRef = firestore.collection('plans').doc(planData.id);
    await planRef.set(planData);
    return planRef;
  },
  getPlan: async (id: string) => {
    const planRef = firestore.collection('plans').doc(id);
    const planDoc = await planRef.get();
    return planDoc.exists ? { id: planDoc.id, ...planDoc.data() } : null;
  },
  // Additional plan service methods...
};

// Subcompany Service
export const subcompanyService = {
  createSubcompany: async (subcompanyData: Subcompany) => {
    const subcompanyRef = firestore.collection('subcompanies').doc(subcompanyData.id);
    await subcompanyRef.set(subcompanyData);
    return subcompanyRef;
  },
  getSubcompany: async (id: string) => {
    const subcompanyRef = firestore.collection('subcompanies').doc(id);
    const subcompanyDoc = await subcompanyRef.get();
    return subcompanyDoc.exists ? { id: subcompanyDoc.id, ...subcompanyDoc.data() } : null;
  },
  // Additional subcompany service methods...
};

// Additional services for other entities can be defined similarly...