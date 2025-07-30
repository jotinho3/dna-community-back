import { Request, Response } from 'express';
import { db } from '../../utils/firebase';
import { CertificateService } from '../../services/certificateService';
import { WorkshopCertificate } from '../../types/workshops';


interface CertificateWithId extends WorkshopCertificate {
  id: string;
}

interface WorkshopData {
  title: string;
  enrolledCount: number;
  creatorId: string;
  [key: string]: any;
}

interface CertificateAnalytics {
  workshopId: string;
  workshopTitle: string;
  certificatesIssued: number;
  completionRate: string;
}

export class CertificateController {

  // Get user's certificates
  static async getUserCertificates(req: Request, res: Response) {
    try {
      const { uid } = req.params;

      const certificates = await CertificateService.getUserCertificates(uid);

      res.json({ 
        certificates,
        total: certificates.length
      });

    } catch (error) {
      console.error('Erro ao buscar certificados do usuário:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }


// Get specific certificate
static async getCertificate(req: Request, res: Response) {
  try {
    const { certificateId } = req.params;

    const certificateDoc = await db.collection('workshop_certificates').doc(certificateId).get();
    
    if (!certificateDoc.exists) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }

    // Properly type the certificate
    const certificateData = certificateDoc.data() as Omit<WorkshopCertificate, 'id'>;
    const certificate: WorkshopCertificate = {
      id: certificateDoc.id,
      ...certificateData
    };

    res.json({ certificate });

  } catch (error) {
    console.error('Erro ao buscar certificado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

  // Verify certificate by verification code
  static async verifyCertificate(req: Request, res: Response) {
    try {
      const { verificationCode } = req.params;

      const certificate = await CertificateService.verifyCertificate(verificationCode);

      if (!certificate) {
        return res.status(404).json({ 
          error: 'Certificado não encontrado ou código de verificação inválido',
          valid: false
        });
      }

      res.json({ 
        certificate,
        valid: true,
        message: 'Certificado válido',
        verifiedAt: new Date()
      });

    } catch (error) {
      console.error('Erro ao verificar certificado:', error);
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // Download certificate PDF
static async downloadCertificate(req: Request, res: Response) {
  try {
    const { certificateId } = req.params;
    const { uid } = req.query; // Optional: verify user owns the certificate

    const certificateDoc = await db.collection('workshop_certificates').doc(certificateId).get();
    
    if (!certificateDoc.exists) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }

    const certificateData = certificateDoc.data() as Omit<WorkshopCertificate, 'id'>;

    // Optional: Check if user owns the certificate
    if (uid && certificateData.userId !== uid) {
      return res.status(403).json({ error: 'Acesso negado ao certificado' });
    }

    // Redirect to the certificate URL for download
    if (certificateData.certificateUrl) {
      res.redirect(certificateData.certificateUrl);
    } else {
      res.status(404).json({ error: 'URL do certificado não encontrada' });
    }

  } catch (error) {
    console.error('Erro ao fazer download do certificado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}


 // Regenerate certificate (for certificate owners or workshop creators)
static async regenerateCertificate(req: Request, res: Response) {
  try {
    const { certificateId } = req.params;
    const { uid } = req.body; // User requesting regeneration

    // Get certificate info
    const certificateDoc = await db.collection('workshop_certificates').doc(certificateId).get();
    
    if (!certificateDoc.exists) {
      return res.status(404).json({ error: 'Certificado não encontrado' });
    }

    const certificateData = certificateDoc.data() as Omit<WorkshopCertificate, 'id'>;

    // Check if user can regenerate (either the certificate owner or workshop creator)
    const workshopDoc = await db.collection('workshops').doc(certificateData.workshopId).get();
    const workshopData = workshopDoc.data() as WorkshopData | undefined;

    const canRegenerate = certificateData.userId === uid || workshopData?.creatorId === uid;

    if (!canRegenerate) {
      return res.status(403).json({ 
        error: 'Apenas o dono do certificado ou criador do workshop pode regenerá-lo' 
      });
    }

    const certificate = await CertificateService.regenerateCertificate(certificateId);

    if (!certificate) {
      return res.status(500).json({ error: 'Falha ao regenerar certificado' });
    }

    res.json({ 
      certificate,
      message: 'Certificado regenerado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao regenerar certificado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

  // Get certificate analytics (for workshop creators)
 // Get certificate analytics (for workshop creators)
static async getCertificateAnalytics(req: Request, res: Response) {
  try {
    const { uid } = req.params;

    // Get workshops created by user
    const workshopsSnapshot = await db.collection('workshops')
      .where('creatorId', '==', uid)
      .get();

    const workshopIds = workshopsSnapshot.docs.map(doc => doc.id);

    if (workshopIds.length === 0) {
      return res.json({
        totalCertificates: 0,
        workshopBreakdown: [],
        recentCertificates: []
      });
    }

    // Get certificates for user's workshops
    const certificatesSnapshot = await db.collection('workshop_certificates')
      .where('workshopId', 'in', workshopIds.slice(0, 10)) // Firestore limit
      .orderBy('issuedAt', 'desc')
      .get();

    // Properly type the certificates
    const certificates: CertificateWithId[] = certificatesSnapshot.docs.map(doc => {
      const data = doc.data() as Omit<WorkshopCertificate, 'id'>;
      return {
        id: doc.id,
        ...data
      };
    });

    // Group by workshop with proper typing
    const workshopBreakdown: CertificateAnalytics[] = workshopIds.map(workshopId => {
      const workshopCertificates = certificates.filter(cert => cert.workshopId === workshopId);
      const workshopDoc = workshopsSnapshot.docs.find(doc => doc.id === workshopId);
      const workshopData = workshopDoc?.data() as WorkshopData | undefined;
      
      return {
        workshopId,
        workshopTitle: workshopData?.title || 'Workshop',
        certificatesIssued: workshopCertificates.length,
        completionRate: workshopData?.enrolledCount && workshopData.enrolledCount > 0 
          ? ((workshopCertificates.length / workshopData.enrolledCount) * 100).toFixed(1)
          : '0'
      };
    });

    res.json({
      totalCertificates: certificates.length,
      workshopBreakdown,
      recentCertificates: certificates.slice(0, 10).map(cert => ({
        id: cert.id,
        userName: cert.userName,
        workshopTitle: cert.workshopTitle,
        issuedAt: cert.issuedAt
      }))
    });

  } catch (error) {
    console.error('Erro ao buscar analytics de certificados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}


 // Bulk certificate operations (for workshop creators)
static async bulkRegenerateCertificates(req: Request, res: Response) {
  try {
    const { workshopId, uid } = req.params;

    // Verify user is workshop creator
    const workshopDoc = await db.collection('workshops').doc(workshopId).get();
    if (!workshopDoc.exists) {
      return res.status(404).json({ error: 'Workshop não encontrado' });
    }

    const workshopData = workshopDoc.data() as WorkshopData;
    if (workshopData.creatorId !== uid) {
      return res.status(403).json({ 
        error: 'Apenas o criador do workshop pode regenerar certificados em lote' 
      });
    }

    // Get all certificates for this workshop
    const certificatesSnapshot = await db.collection('workshop_certificates')
      .where('workshopId', '==', workshopId)
      .get();

    const regenerationPromises = certificatesSnapshot.docs.map(doc => 
      CertificateService.regenerateCertificate(doc.id)
    );

    const results = await Promise.allSettled(regenerationPromises);

    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    res.json({
      message: 'Regeneração em lote concluída',
      total: certificatesSnapshot.docs.length,
      successful,
      failed
    });

  } catch (error) {
    console.error('Erro na regeneração em lote:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
}