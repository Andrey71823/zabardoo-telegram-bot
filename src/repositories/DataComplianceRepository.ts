import { Pool } from 'pg';
import { UserConsent, DataProcessingRecord, DataDeletionRequest, ComplianceAuditLog } from '../models/DataCompliance';

export class DataComplianceRepository {
  constructor(private db: Pool) {}

  // User Consent Management
  async createUserConsent(consent: Omit<UserConsent, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserConsent> {
    const query = `
      INSERT INTO user_consents (
        user_id, consent_type, granted, granted_at, revoked_at,
        ip_address, user_agent, version, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      consent.userId,
      consent.consentType,
      consent.granted,
      consent.grantedAt,
      consent.revokedAt,
      consent.ipAddress,
      consent.userAgent,
      consent.version,
      JSON.stringify(consent.metadata)
    ];

    const result = await this.db.query(query, values);
    return this.mapConsentRow(result.rows[0]);
  }

  async getUserConsents(userId: string): Promise<UserConsent[]> {
    const query = `
      SELECT * FROM user_consents 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(this.mapConsentRow);
  }

  async getActiveConsents(userId: string): Promise<UserConsent[]> {
    const query = `
      SELECT DISTINCT ON (consent_type) *
      FROM user_consents 
      WHERE user_id = $1 AND granted = true AND revoked_at IS NULL
      ORDER BY consent_type, created_at DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(this.mapConsentRow);
  }

  async revokeConsent(userId: string, consentType: string): Promise<void> {
    const query = `
      UPDATE user_consents 
      SET revoked_at = NOW(), updated_at = NOW()
      WHERE user_id = $1 AND consent_type = $2 AND granted = true AND revoked_at IS NULL
    `;
    
    await this.db.query(query, [userId, consentType]);
  }

  // Data Processing Records
  async createProcessingRecord(record: Omit<DataProcessingRecord, 'id' | 'createdAt'>): Promise<DataProcessingRecord> {
    const query = `
      INSERT INTO data_processing_records (
        user_id, data_type, processing_purpose, legal_basis,
        data_source, processing_date, retention_period, deletion_date, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    
    const values = [
      record.userId,
      record.dataType,
      record.processingPurpose,
      record.legalBasis,
      record.dataSource,
      record.processingDate,
      record.retentionPeriod,
      record.deletionDate,
      JSON.stringify(record.metadata)
    ];

    const result = await this.db.query(query, values);
    return this.mapProcessingRow(result.rows[0]);
  }

  async getProcessingRecords(userId: string): Promise<DataProcessingRecord[]> {
    const query = `
      SELECT * FROM data_processing_records 
      WHERE user_id = $1 
      ORDER BY processing_date DESC
    `;
    
    const result = await this.db.query(query, [userId]);
    return result.rows.map(this.mapProcessingRow);
  }

  async getExpiredData(): Promise<DataProcessingRecord[]> {
    const query = `
      SELECT * FROM data_processing_records 
      WHERE deletion_date <= NOW() AND deletion_date IS NOT NULL
      ORDER BY deletion_date ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map(this.mapProcessingRow);
  }

  // Data Deletion Requests
  async createDeletionRequest(request: Omit<DataDeletionRequest, 'id'>): Promise<DataDeletionRequest> {
    const query = `
      INSERT INTO data_deletion_requests (
        user_id, request_type, requested_data, reason, status,
        requested_at, verification_token, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const values = [
      request.userId,
      request.requestType,
      JSON.stringify(request.requestedData),
      request.reason,
      request.status,
      request.requestedAt,
      request.verificationToken,
      JSON.stringify(request.metadata)
    ];

    const result = await this.db.query(query, values);
    return this.mapDeletionRow(result.rows[0]);
  }

  async getDeletionRequest(id: string): Promise<DataDeletionRequest | null> {
    const query = `SELECT * FROM data_deletion_requests WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    
    return result.rows.length > 0 ? this.mapDeletionRow(result.rows[0]) : null;
  }

  async updateDeletionRequestStatus(
    id: string, 
    status: DataDeletionRequest['status'],
    rejectionReason?: string
  ): Promise<void> {
    const query = `
      UPDATE data_deletion_requests 
      SET status = $2, 
          processed_at = CASE WHEN $2 = 'processing' THEN NOW() ELSE processed_at END,
          completed_at = CASE WHEN $2 IN ('completed', 'rejected') THEN NOW() ELSE completed_at END,
          rejection_reason = $3
      WHERE id = $1
    `;
    
    await this.db.query(query, [id, status, rejectionReason]);
  }

  async getPendingDeletionRequests(): Promise<DataDeletionRequest[]> {
    const query = `
      SELECT * FROM data_deletion_requests 
      WHERE status = 'pending' 
      ORDER BY requested_at ASC
    `;
    
    const result = await this.db.query(query);
    return result.rows.map(this.mapDeletionRow);
  }

  // Compliance Audit Logs
  async createAuditLog(log: Omit<ComplianceAuditLog, 'id'>): Promise<void> {
    const query = `
      INSERT INTO compliance_audit_logs (
        user_id, action, data_type, legal_basis, timestamp,
        ip_address, user_agent, result, details, compliance_officer
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `;
    
    const values = [
      log.userId,
      log.action,
      log.dataType,
      log.legalBasis,
      log.timestamp,
      log.ipAddress,
      log.userAgent,
      log.result,
      JSON.stringify(log.details),
      log.complianceOfficer
    ];

    await this.db.query(query, values);
  }

  async getAuditLogs(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<ComplianceAuditLog[]> {
    let query = `
      SELECT * FROM compliance_audit_logs 
      WHERE timestamp BETWEEN $1 AND $2
    `;
    const values: any[] = [startDate, endDate];

    if (userId) {
      query += ` AND user_id = $3`;
      values.push(userId);
    }

    query += ` ORDER BY timestamp DESC`;
    
    const result = await this.db.query(query, values);
    return result.rows.map(this.mapAuditRow);
  }

  // Data Export for User Rights
  async exportUserData(userId: string): Promise<Record<string, any>> {
    const userData: Record<string, any> = {};

    // Get user basic info
    const userQuery = `SELECT * FROM users WHERE id = $1`;
    const userResult = await this.db.query(userQuery, [userId]);
    userData.profile = userResult.rows[0];

    // Get consents
    userData.consents = await this.getUserConsents(userId);

    // Get processing records
    userData.processingRecords = await this.getProcessingRecords(userId);

    // Get cashback data
    const cashbackQuery = `SELECT * FROM cashback_transactions WHERE user_id = $1`;
    const cashbackResult = await this.db.query(cashbackQuery, [userId]);
    userData.cashback = cashbackResult.rows;

    // Get recommendations
    const recommendationsQuery = `SELECT * FROM user_recommendations WHERE user_id = $1`;
    const recommendationsResult = await this.db.query(recommendationsQuery, [userId]);
    userData.recommendations = recommendationsResult.rows;

    return userData;
  }

  // Helper methods
  private mapConsentRow(row: any): UserConsent {
    return {
      id: row.id,
      userId: row.user_id,
      consentType: row.consent_type,
      granted: row.granted,
      grantedAt: row.granted_at,
      revokedAt: row.revoked_at,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      version: row.version,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapProcessingRow(row: any): DataProcessingRecord {
    return {
      id: row.id,
      userId: row.user_id,
      dataType: row.data_type,
      processingPurpose: row.processing_purpose,
      legalBasis: row.legal_basis,
      dataSource: row.data_source,
      processingDate: row.processing_date,
      retentionPeriod: row.retention_period,
      deletionDate: row.deletion_date,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at
    };
  }

  private mapDeletionRow(row: any): DataDeletionRequest {
    return {
      id: row.id,
      userId: row.user_id,
      requestType: row.request_type,
      requestedData: JSON.parse(row.requested_data),
      reason: row.reason,
      status: row.status,
      requestedAt: row.requested_at,
      processedAt: row.processed_at,
      completedAt: row.completed_at,
      rejectionReason: row.rejection_reason,
      verificationToken: row.verification_token,
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  private mapAuditRow(row: any): ComplianceAuditLog {
    return {
      id: row.id,
      userId: row.user_id,
      action: row.action,
      dataType: row.data_type,
      legalBasis: row.legal_basis,
      timestamp: row.timestamp,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      result: row.result,
      details: JSON.parse(row.details),
      complianceOfficer: row.compliance_officer
    };
  }
}