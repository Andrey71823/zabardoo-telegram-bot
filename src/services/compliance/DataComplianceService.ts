import { DataComplianceRepository } from '../../repositories/DataComplianceRepository';
import { 
  UserConsent, 
  DataProcessingRecord, 
  DataDeletionRequest, 
  ComplianceAuditLog,
  IndianDataProtectionCompliance 
} from '../../models/DataCompliance';
import crypto from 'crypto';
import { logger } from '../../config/logger';

export class DataComplianceService {
  constructor(private repository: DataComplianceRepository) {}

  // Consent Management (PDPB Compliance)
  async grantConsent(
    userId: string,
    consentType: UserConsent['consentType'],
    ipAddress: string,
    userAgent: string,
    version: string = '1.0'
  ): Promise<UserConsent> {
    // First revoke any existing consent of the same type
    await this.repository.revokeConsent(userId, consentType);

    const consent = await this.repository.createUserConsent({
      userId,
      consentType,
      granted: true,
      grantedAt: new Date(),
      ipAddress,
      userAgent,
      version,
      metadata: {
        source: 'user_action',
        timestamp: new Date().toISOString()
      }
    });

    await this.logComplianceAction({
      userId,
      action: 'consent_granted',
      dataType: consentType,
      legalBasis: 'consent',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      result: 'success',
      details: { consentType, version }
    });

    logger.info(`Consent granted for user ${userId}, type: ${consentType}`);
    return consent;
  }

  async revokeConsent(
    userId: string,
    consentType: UserConsent['consentType'],
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    await this.repository.revokeConsent(userId, consentType);

    await this.logComplianceAction({
      userId,
      action: 'consent_revoked',
      dataType: consentType,
      legalBasis: 'consent',
      timestamp: new Date(),
      ipAddress,
      userAgent,
      result: 'success',
      details: { consentType }
    });

    // Trigger data deletion for revoked consent
    if (consentType === 'data_collection') {
      await this.initiateDataDeletion(userId, 'anonymization', ['personal_data'], 'consent_revoked');
    }

    logger.info(`Consent revoked for user ${userId}, type: ${consentType}`);
  }

  async checkConsent(userId: string, consentType: UserConsent['consentType']): Promise<boolean> {
    const activeConsents = await this.repository.getActiveConsents(userId);
    return activeConsents.some(consent => consent.consentType === consentType);
  }

  // Data Processing Records (Purpose Limitation & Storage Minimization)
  async recordDataProcessing(
    userId: string,
    dataType: DataProcessingRecord['dataType'],
    processingPurpose: string,
    legalBasis: DataProcessingRecord['legalBasis'],
    dataSource: string,
    retentionDays: number = 365
  ): Promise<DataProcessingRecord> {
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + retentionDays);

    const record = await this.repository.createProcessingRecord({
      userId,
      dataType,
      processingPurpose,
      legalBasis,
      dataSource,
      processingDate: new Date(),
      retentionPeriod: retentionDays,
      deletionDate,
      metadata: {
        retentionPolicy: this.getRetentionPolicy(dataType),
        complianceVersion: '1.0'
      }
    });

    await this.logComplianceAction({
      userId,
      action: 'data_processed',
      dataType,
      legalBasis,
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'system',
      result: 'success',
      details: { processingPurpose, retentionDays }
    });

    return record;
  }

  // Data Deletion (Right to be Forgotten)
  async initiateDataDeletion(
    userId: string,
    requestType: DataDeletionRequest['requestType'],
    requestedData: string[],
    reason?: string
  ): Promise<DataDeletionRequest> {
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const request = await this.repository.createDeletionRequest({
      userId,
      requestType,
      requestedData,
      reason,
      status: 'pending',
      requestedAt: new Date(),
      verificationToken,
      metadata: {
        initiatedBy: 'user',
        estimatedCompletionDays: this.getEstimatedDeletionDays(requestType)
      }
    });

    await this.logComplianceAction({
      userId,
      action: 'deletion_requested',
      dataType: 'mixed',
      legalBasis: 'user_rights',
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'system',
      result: 'success',
      details: { requestType, requestedData, reason }
    });

    // Start processing immediately for automated deletions
    if (requestType === 'anonymization') {
      await this.processDeletionRequest(request.id);
    }

    logger.info(`Data deletion initiated for user ${userId}, type: ${requestType}`);
    return request;
  }

  async processDeletionRequest(requestId: string): Promise<void> {
    const request = await this.repository.getDeletionRequest(requestId);
    if (!request || request.status !== 'pending') {
      return;
    }

    await this.repository.updateDeletionRequestStatus(requestId, 'processing');

    try {
      // Process deletion based on type
      switch (request.requestType) {
        case 'full_deletion':
          await this.performFullDeletion(request.userId);
          break;
        case 'partial_deletion':
          await this.performPartialDeletion(request.userId, request.requestedData);
          break;
        case 'anonymization':
          await this.performAnonymization(request.userId, request.requestedData);
          break;
      }

      await this.repository.updateDeletionRequestStatus(requestId, 'completed');

      await this.logComplianceAction({
        userId: request.userId,
        action: 'deletion_completed',
        dataType: 'mixed',
        legalBasis: 'user_rights',
        timestamp: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        result: 'success',
        details: { requestId, requestType: request.requestType }
      });

      logger.info(`Data deletion completed for request ${requestId}`);
    } catch (error) {
      await this.repository.updateDeletionRequestStatus(
        requestId, 
        'rejected', 
        `Processing error: ${error.message}`
      );

      await this.logComplianceAction({
        userId: request.userId,
        action: 'deletion_failed',
        dataType: 'mixed',
        legalBasis: 'user_rights',
        timestamp: new Date(),
        ipAddress: 'system',
        userAgent: 'system',
        result: 'failure',
        details: { requestId, error: error.message }
      });

      logger.error(`Data deletion failed for request ${requestId}:`, error);
    }
  }

  // Data Export (Right to Data Portability)
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const hasConsent = await this.checkConsent(userId, 'data_collection');
    if (!hasConsent) {
      throw new Error('User has not consented to data collection');
    }

    const userData = await this.repository.exportUserData(userId);

    await this.logComplianceAction({
      userId,
      action: 'data_exported',
      dataType: 'mixed',
      legalBasis: 'user_rights',
      timestamp: new Date(),
      ipAddress: 'system',
      userAgent: 'system',
      result: 'success',
      details: { exportSize: JSON.stringify(userData).length }
    });

    logger.info(`Data exported for user ${userId}`);
    return userData;
  }

  // Compliance Monitoring
  async generateComplianceReport(): Promise<IndianDataProtectionCompliance> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const auditLogs = await this.repository.getAuditLogs(thirtyDaysAgo, now);
    
    const compliance: IndianDataProtectionCompliance = {
      // PDPB compliance checks
      dataMinimization: await this.checkDataMinimization(),
      purposeLimitation: await this.checkPurposeLimitation(),
      storageMinimization: await this.checkStorageMinimization(),
      dataAccuracy: await this.checkDataAccuracy(),
      transparencyAndAccountability: await this.checkTransparency(),
      
      // IT Rules 2021 compliance
      grievanceOfficerAppointed: true, // Configured in system
      monthlyComplianceReport: true,
      contentModerationCompliance: true,
      
      // RBI guidelines
      paymentDataLocalization: true, // Data stored in India
      paymentDataRetention: await this.checkPaymentDataRetention(),
      
      lastAuditDate: now,
      nextAuditDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      complianceScore: this.calculateComplianceScore(auditLogs)
    };

    logger.info('Compliance report generated', { score: compliance.complianceScore });
    return compliance;
  }

  // Automated Data Retention Management
  async processExpiredData(): Promise<void> {
    const expiredRecords = await this.repository.getExpiredData();
    
    for (const record of expiredRecords) {
      try {
        await this.initiateDataDeletion(
          record.userId,
          'anonymization',
          [record.dataType],
          'retention_period_expired'
        );
      } catch (error) {
        logger.error(`Failed to process expired data for user ${record.userId}:`, error);
      }
    }

    logger.info(`Processed ${expiredRecords.length} expired data records`);
  }

  // Private helper methods
  private async performFullDeletion(userId: string): Promise<void> {
    // Delete from all tables - implement based on your schema
    const tables = [
      'users', 'user_preferences', 'cashback_transactions',
      'user_recommendations', 'user_interactions', 'user_sessions'
    ];

    for (const table of tables) {
      try {
        await this.repository['db'].query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
      } catch (error) {
        logger.warn(`Failed to delete from ${table} for user ${userId}:`, error);
      }
    }
  }

  private async performPartialDeletion(userId: string, dataTypes: string[]): Promise<void> {
    // Implement partial deletion based on data types
    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'personal_data':
          await this.repository['db'].query(
            `UPDATE users SET name = 'Deleted User', email = 'deleted@example.com', phone = NULL WHERE id = $1`,
            [userId]
          );
          break;
        case 'behavioral_data':
          await this.repository['db'].query(`DELETE FROM user_interactions WHERE user_id = $1`, [userId]);
          break;
        // Add more cases as needed
      }
    }
  }

  private async performAnonymization(userId: string, dataTypes: string[]): Promise<void> {
    // Anonymize data instead of deleting
    const anonymousId = crypto.randomBytes(16).toString('hex');
    
    for (const dataType of dataTypes) {
      switch (dataType) {
        case 'personal_data':
          await this.repository['db'].query(
            `UPDATE users SET name = $1, email = $2, phone = NULL WHERE id = $3`,
            [`Anonymous_${anonymousId}`, `anon_${anonymousId}@example.com`, userId]
          );
          break;
        // Add more anonymization cases
      }
    }
  }

  private getRetentionPolicy(dataType: DataProcessingRecord['dataType']): string {
    const policies = {
      'personal': '2 years for inactive users',
      'sensitive': '1 year after purpose fulfillment',
      'financial': '7 years (RBI requirement)',
      'behavioral': '1 year for analytics',
      'location': '6 months unless consent'
    };
    return policies[dataType] || '1 year default';
  }

  private getEstimatedDeletionDays(requestType: DataDeletionRequest['requestType']): number {
    const estimates = {
      'full_deletion': 30,
      'partial_deletion': 15,
      'anonymization': 7
    };
    return estimates[requestType] || 30;
  }

  private async checkDataMinimization(): Promise<boolean> {
    // Check if we're collecting only necessary data
    return true; // Implement actual check
  }

  private async checkPurposeLimitation(): Promise<boolean> {
    // Check if data is used only for stated purposes
    return true; // Implement actual check
  }

  private async checkStorageMinimization(): Promise<boolean> {
    // Check if data is stored only as long as necessary
    return true; // Implement actual check
  }

  private async checkDataAccuracy(): Promise<boolean> {
    // Check data accuracy measures
    return true; // Implement actual check
  }

  private async checkTransparency(): Promise<boolean> {
    // Check transparency measures
    return true; // Implement actual check
  }

  private async checkPaymentDataRetention(): Promise<boolean> {
    // Check if payment data is retained for max 24 months
    return true; // Implement actual check
  }

  private calculateComplianceScore(auditLogs: ComplianceAuditLog[]): number {
    if (auditLogs.length === 0) return 100;

    const successfulActions = auditLogs.filter(log => log.result === 'success').length;
    return Math.round((successfulActions / auditLogs.length) * 100);
  }

  private async logComplianceAction(log: Omit<ComplianceAuditLog, 'id'>): Promise<void> {
    await this.repository.createAuditLog(log);
  }
}