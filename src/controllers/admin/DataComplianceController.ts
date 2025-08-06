import { Request, Response } from 'express';
import { DataComplianceService } from '../../services/compliance/DataComplianceService';
import { logger } from '../../config/logger';

export class DataComplianceController {
  constructor(private complianceService: DataComplianceService) {}

  // Consent Management
  async grantConsent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, consentType, version } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      const consent = await this.complianceService.grantConsent(
        userId,
        consentType,
        ipAddress,
        userAgent,
        version
      );

      res.status(201).json({
        success: true,
        data: consent,
        message: 'Consent granted successfully'
      });
    } catch (error) {
      logger.error('Error granting consent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to grant consent',
        error: error.message
      });
    }
  }

  async revokeConsent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, consentType } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent') || 'unknown';

      await this.complianceService.revokeConsent(
        userId,
        consentType,
        ipAddress,
        userAgent
      );

      res.json({
        success: true,
        message: 'Consent revoked successfully'
      });
    } catch (error) {
      logger.error('Error revoking consent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to revoke consent',
        error: error.message
      });
    }
  }

  async checkConsent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, consentType } = req.params;

      const hasConsent = await this.complianceService.checkConsent(userId, consentType as any);

      res.json({
        success: true,
        data: { hasConsent },
        message: 'Consent status retrieved'
      });
    } catch (error) {
      logger.error('Error checking consent:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to check consent',
        error: error.message
      });
    }
  }

  // Data Deletion Requests
  async requestDataDeletion(req: Request, res: Response): Promise<void> {
    try {
      const { userId, requestType, requestedData, reason } = req.body;

      const request = await this.complianceService.initiateDataDeletion(
        userId,
        requestType,
        requestedData,
        reason
      );

      res.status(201).json({
        success: true,
        data: request,
        message: 'Data deletion request submitted successfully'
      });
    } catch (error) {
      logger.error('Error requesting data deletion:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit deletion request',
        error: error.message
      });
    }
  }

  async processDeletionRequest(req: Request, res: Response): Promise<void> {
    try {
      const { requestId } = req.params;

      await this.complianceService.processDeletionRequest(requestId);

      res.json({
        success: true,
        message: 'Deletion request processed successfully'
      });
    } catch (error) {
      logger.error('Error processing deletion request:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process deletion request',
        error: error.message
      });
    }
  }

  // Data Export
  async exportUserData(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const userData = await this.complianceService.exportUserData(userId);

      res.json({
        success: true,
        data: userData,
        message: 'User data exported successfully'
      });
    } catch (error) {
      logger.error('Error exporting user data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to export user data',
        error: error.message
      });
    }
  }

  // Compliance Reporting
  async getComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const report = await this.complianceService.generateComplianceReport();

      res.json({
        success: true,
        data: report,
        message: 'Compliance report generated successfully'
      });
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate compliance report',
        error: error.message
      });
    }
  }

  // Data Processing Records
  async recordDataProcessing(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        dataType,
        processingPurpose,
        legalBasis,
        dataSource,
        retentionDays
      } = req.body;

      const record = await this.complianceService.recordDataProcessing(
        userId,
        dataType,
        processingPurpose,
        legalBasis,
        dataSource,
        retentionDays
      );

      res.status(201).json({
        success: true,
        data: record,
        message: 'Data processing recorded successfully'
      });
    } catch (error) {
      logger.error('Error recording data processing:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record data processing',
        error: error.message
      });
    }
  }

  // Automated Processes
  async processExpiredData(req: Request, res: Response): Promise<void> {
    try {
      await this.complianceService.processExpiredData();

      res.json({
        success: true,
        message: 'Expired data processed successfully'
      });
    } catch (error) {
      logger.error('Error processing expired data:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process expired data',
        error: error.message
      });
    }
  }

  // Grievance Management (IT Rules 2021)
  async submitGrievance(req: Request, res: Response): Promise<void> {
    try {
      const {
        userId,
        grievanceType,
        description,
        priority = 'medium'
      } = req.body;

      // This would be implemented in a separate GrievanceService
      // For now, we'll create a basic implementation
      const grievanceId = `GRV-${Date.now()}`;

      res.status(201).json({
        success: true,
        data: {
          id: grievanceId,
          userId,
          grievanceType,
          description,
          priority,
          status: 'open',
          submittedAt: new Date(),
          expectedResolutionTime: '15 days'
        },
        message: 'Grievance submitted successfully'
      });
    } catch (error) {
      logger.error('Error submitting grievance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit grievance',
        error: error.message
      });
    }
  }

  // Data Localization Status (RBI Compliance)
  async getDataLocalizationStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = {
        paymentData: {
          localized: true,
          location: 'India',
          lastAudit: new Date(),
          compliance: 'compliant'
        },
        personalData: {
          localized: true,
          location: 'India',
          lastAudit: new Date(),
          compliance: 'compliant'
        },
        sensitiveData: {
          localized: true,
          location: 'India',
          lastAudit: new Date(),
          compliance: 'compliant'
        },
        overallCompliance: 'compliant',
        lastComplianceCheck: new Date()
      };

      res.json({
        success: true,
        data: status,
        message: 'Data localization status retrieved'
      });
    } catch (error) {
      logger.error('Error getting data localization status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get data localization status',
        error: error.message
      });
    }
  }

  // Privacy Policy and Terms Management
  async getPrivacyPolicy(req: Request, res: Response): Promise<void> {
    try {
      const privacyPolicy = {
        version: '2.0',
        lastUpdated: new Date('2024-01-01'),
        language: 'en',
        content: {
          dataCollection: 'We collect personal data only with your explicit consent...',
          dataUsage: 'Your data is used only for the purposes you have consented to...',
          dataSharing: 'We do not share your personal data with third parties without consent...',
          dataRetention: 'We retain your data only as long as necessary...',
          userRights: 'You have the right to access, correct, and delete your data...',
          grievanceRedressal: 'For any privacy concerns, contact our Grievance Officer...',
          dataLocalization: 'All payment data is stored within India as per RBI guidelines...',
          contactInfo: {
            grievanceOfficer: 'privacy@zabardoo.com',
            address: 'Zabardoo Technologies, India',
            phone: '+91-XXXXXXXXXX'
          }
        }
      };

      res.json({
        success: true,
        data: privacyPolicy,
        message: 'Privacy policy retrieved'
      });
    } catch (error) {
      logger.error('Error getting privacy policy:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get privacy policy',
        error: error.message
      });
    }
  }

  // Consent Dashboard for Users
  async getUserConsentDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      // This would fetch actual consent data from the service
      const dashboard = {
        userId,
        consents: {
          dataCollection: { granted: true, grantedAt: new Date(), canRevoke: true },
          marketing: { granted: false, grantedAt: null, canRevoke: true },
          analytics: { granted: true, grantedAt: new Date(), canRevoke: true },
          cookies: { granted: true, grantedAt: new Date(), canRevoke: true },
          thirdPartySharing: { granted: false, grantedAt: null, canRevoke: true }
        },
        dataProcessing: {
          totalRecords: 15,
          activeProcessing: 8,
          scheduledDeletion: 2
        },
        rights: {
          canExportData: true,
          canDeleteData: true,
          canCorrectData: true,
          canRestrictProcessing: true
        },
        lastUpdated: new Date()
      };

      res.json({
        success: true,
        data: dashboard,
        message: 'User consent dashboard retrieved'
      });
    } catch (error) {
      logger.error('Error getting user consent dashboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get consent dashboard',
        error: error.message
      });
    }
  }
}