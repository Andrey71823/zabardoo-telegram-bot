import { Router } from 'express';
import { DataComplianceController } from '../../controllers/admin/DataComplianceController';
import { DataComplianceService } from '../../services/compliance/DataComplianceService';
import { DataComplianceRepository } from '../../repositories/DataComplianceRepository';
import { pool } from '../../config/database';

const router = Router();

// Initialize dependencies
const repository = new DataComplianceRepository(pool);
const service = new DataComplianceService(repository);
const controller = new DataComplianceController(service);

// Consent Management Routes
router.post('/consent/grant', controller.grantConsent.bind(controller));
router.post('/consent/revoke', controller.revokeConsent.bind(controller));
router.get('/consent/:userId/:consentType', controller.checkConsent.bind(controller));
router.get('/consent/dashboard/:userId', controller.getUserConsentDashboard.bind(controller));

// Data Deletion Routes (Right to be Forgotten)
router.post('/deletion/request', controller.requestDataDeletion.bind(controller));
router.post('/deletion/process/:requestId', controller.processDeletionRequest.bind(controller));

// Data Export Routes (Right to Data Portability)
router.get('/export/:userId', controller.exportUserData.bind(controller));

// Data Processing Records
router.post('/processing/record', controller.recordDataProcessing.bind(controller));

// Compliance Reporting
router.get('/report/compliance', controller.getComplianceReport.bind(controller));
router.get('/localization/status', controller.getDataLocalizationStatus.bind(controller));

// Automated Processes
router.post('/process/expired-data', controller.processExpiredData.bind(controller));

// Grievance Management (IT Rules 2021)
router.post('/grievance/submit', controller.submitGrievance.bind(controller));

// Privacy Policy and Terms
router.get('/privacy-policy', controller.getPrivacyPolicy.bind(controller));

export default router;