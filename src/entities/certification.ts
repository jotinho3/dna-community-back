import { firestore } from '../utils/firebase';

export interface Certification {
  id: string;
  userId: string;
  workshopPathId: string;
  issued_at: Date;
  certificate_url: string;
}

export const createCertification = async (certification: Certification) => {
  const certificationRef = firestore.collection('certifications').doc(certification.id);
  await certificationRef.set(certification);
};

export const getCertification = async (id: string) => {
  const certificationRef = firestore.collection('certifications').doc(id);
  const doc = await certificationRef.get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
};

export const updateCertification = async (id: string, certification: Partial<Certification>) => {
  const certificationRef = firestore.collection('certifications').doc(id);
  await certificationRef.update(certification);
};

export const deleteCertification = async (id: string) => {
  const certificationRef = firestore.collection('certifications').doc(id);
  await certificationRef.delete();
};