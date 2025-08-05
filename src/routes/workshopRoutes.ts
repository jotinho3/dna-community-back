import express from 'express';
import { WorkshopController } from '../controllers/workshop/workshopController';
import { EnrollmentController } from '../controllers/workshop/enrollmentController';
import { CertificateController } from '../controllers/workshop/certificateController';

const router = express.Router();

// ============ WORKSHOP MANAGEMENT ROUTES ============

// Create workshop (POST /api/workshops/:uid)
router.post('/:uid', WorkshopController.createWorkshop);

// Get single workshop by ID (GET /api/workshops/workshop/:workshopId)
router.get('/workshop/:workshopId', WorkshopController.getWorkshop);

// Get available workshops (GET /api/workshops/available)
router.get('/:uid/available', WorkshopController.getAvailableWorkshops);

// Get workshops created by user (GET /api/workshops/:uid/created)
router.get('/:uid/created', WorkshopController.getUserCreatedWorkshops);

// Update workshop (PUT /api/workshops/:workshopId/:uid)
router.put('/:workshopId/:uid', WorkshopController.updateWorkshop);

// Publish workshop (PUT /api/workshops/:workshopId/:uid/publish)
router.put('/:workshopId/:uid/publish', WorkshopController.publishWorkshop);

// Cancel workshop (PUT /api/workshops/:workshopId/:uid/cancel)
router.put('/:workshopId/:uid/cancel', WorkshopController.cancelWorkshop);

// Get user workshop statistics (GET /api/workshops/:uid/stats)
router.get('/:uid/stats', WorkshopController.getUserWorkshopStats);

// ============ ENROLLMENT ROUTES ============

// Enroll in workshop (POST /api/workshops/:workshopId/:uid/enroll)
router.post('/:workshopId/:uid/enroll', EnrollmentController.enrollWorkshop);

// Cancel enrollment (DELETE /api/workshops/:workshopId/:uid/enroll)
router.delete('/:workshopId/:uid/enroll', EnrollmentController.cancelEnrollment);

// Complete workshop (PUT /api/workshops/:workshopId/:uid/complete)
router.put('/:workshopId/:uid/complete', EnrollmentController.completeWorkshop);

// Get user enrollments (GET /api/workshops/:uid/enrollments)
router.get('/:uid/enrollments', EnrollmentController.getUserEnrollments);

// Get workshop participants - for creators only (GET /api/workshops/:workshopId/:uid/participants)
router.get('/:workshopId/:uid/participants', EnrollmentController.getWorkshopParticipants);

// ============ CERTIFICATE ROUTES ============

// Get user certificates (GET /api/workshops/:uid/certificates)
router.get('/:uid/certificates', CertificateController.getUserCertificates);

// Get specific certificate (GET /api/workshops/certificate/:certificateId)
router.get('/certificate/:certificateId', CertificateController.getCertificate);

// Verify certificate (GET /api/workshops/certificate/verify/:verificationCode)
router.get('/certificate/verify/:verificationCode', CertificateController.verifyCertificate);

// Download certificate (GET /api/workshops/certificate/:certificateId/download)
router.get('/certificate/:certificateId/download', CertificateController.downloadCertificate);

// Regenerate certificate (PUT /api/workshops/certificate/:certificateId/regenerate)
router.put('/certificate/:certificateId/regenerate', CertificateController.regenerateCertificate);


// Get certificate analytics for workshop creators (GET /api/workshops/:uid/certificate-analytics)
router.get('/:uid/certificate-analytics', CertificateController.getCertificateAnalytics);

// Bulk regenerate certificates for a workshop (PUT /api/workshops/:workshopId/:uid/certificates/regenerate)
router.put('/:workshopId/:uid/certificates/regenerate', CertificateController.bulkRegenerateCertificates);

export default router;