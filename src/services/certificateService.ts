import { WorkshopCertificate } from '../types/workshops';
import { db } from '../utils/firebase';

export interface CertificateData {
  workshopId: string;
  workshopTitle: string;
  userId: string;
  userName: string;
  completedAt: Date;
  creatorName?: string;
  duration?: number;
}

export class CertificateService {
  
  static async generateCertificate(data: CertificateData): Promise<WorkshopCertificate> {
    try {
      const verificationCode = this.generateVerificationCode();
      
      // Generate PDF certificate
      const certificateUrl = await this.createCertificatePDF(data, verificationCode);
      
      const certificate: Omit<WorkshopCertificate, 'id'> = {
        workshopId: data.workshopId,
        workshopTitle: data.workshopTitle,
        userId: data.userId,
        userName: data.userName,
        completedAt: data.completedAt,
        issuedAt: new Date(),
        certificateUrl,
        verificationCode,
        validUntil: undefined // Certificates don't expire by default
      };

      // Save certificate to database
      const certificateRef = await db.collection('workshop_certificates').add(certificate);
      
      const fullCertificate: WorkshopCertificate = {
        id: certificateRef.id,
        ...certificate
      };

      console.log(`Certificate generated for user ${data.userName}: ${verificationCode}`);
      return fullCertificate;

    } catch (error) {
      console.error('Erro ao gerar certificado:', error);
      throw new Error('Falha ao gerar certificado');
    }
  }

  private static generateVerificationCode(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 8).toUpperCase();
    return `DNA-${timestamp}-${random}`;
  }

  private static async createCertificatePDF(
    data: CertificateData, 
    verificationCode: string
  ): Promise<string> {
    try {
      // TODO: Implement PDF generation using jsPDF, Puppeteer, or similar
      // For now, return a placeholder URL
      
      const filename = `certificate_${data.userId}_${data.workshopId}_${Date.now()}.pdf`;
      const certificateUrl = `https://storage.googleapis.com/dna-community-certificates/${filename}`;
      
      // Here you would:
      // 1. Generate PDF with workshop details
      // 2. Upload to Firebase Storage or your preferred storage
      // 3. Return the public URL
      
      console.log(`PDF certificate created: ${filename}`);
      return certificateUrl;

    } catch (error) {
      console.error('Erro ao criar PDF do certificado:', error);
      throw error;
    }
  }

  static async verifyCertificate(verificationCode: string): Promise<WorkshopCertificate | null> {
    try {
      const snapshot = await db.collection('workshop_certificates')
        .where('verificationCode', '==', verificationCode)
        .get();

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data()
      } as WorkshopCertificate;

    } catch (error) {
      console.error('Erro ao verificar certificado:', error);
      return null;
    }
  }

  static async getUserCertificates(userId: string): Promise<WorkshopCertificate[]> {
    try {
      const snapshot = await db.collection('workshop_certificates')
        .where('userId', '==', userId)
        .orderBy('issuedAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WorkshopCertificate[];

    } catch (error) {
      console.error('Erro ao buscar certificados do usuário:', error);
      return [];
    }
  }

  static async regenerateCertificate(certificateId: string): Promise<WorkshopCertificate | null> {
    try {
      const certificateDoc = await db.collection('workshop_certificates').doc(certificateId).get();
      
      if (!certificateDoc.exists) {
        return null;
      }

      const certificateData = certificateDoc.data() as WorkshopCertificate;
      
      // Generate new PDF with same data
      const newCertificateUrl = await this.createCertificatePDF({
        workshopId: certificateData.workshopId,
        workshopTitle: certificateData.workshopTitle,
        userId: certificateData.userId,
        userName: certificateData.userName,
        completedAt: certificateData.completedAt
      }, certificateData.verificationCode);

      // Update certificate URL
      await certificateDoc.ref.update({
        certificateUrl: newCertificateUrl,
        updatedAt: new Date()
      });

      return {
        ...certificateData,
        certificateUrl: newCertificateUrl
      };

    } catch (error) {
      console.error('Erro ao regenerar certificado:', error);
      return null;
    }
  }
}