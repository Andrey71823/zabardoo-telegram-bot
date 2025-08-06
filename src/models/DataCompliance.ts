export interface UserConsent {
  id: string;
  userId: string;
  consentType: 'data_collection' | 'marketing' | 'analytics' | 'cookies' | 'third_party_sharing';
  granted: boolean;
  grantedAt: Date;
  revokedAt?: Date;
  ipAddress: string;
  userAgent: string;
  version: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataProcessingRecord {
  id: string;
  userId: string;
  dataType: 'personal' | 'sensitive' | 'financial' | 'behavioral' | 'location';
  processingPurpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataSource: string;
  processingDate: Date;
  retentionPeriod: number; // days
  deletionDate?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  requestType: 'full_deletion' | 'partial_deletion' | 'anonymization';
  requestedData: string[];
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestedAt: Date;
  processedAt?: Date;
  completedAt?: Date;
  rejectionReason?: string;
  verificationToken: string;
  metadata?: Record<string, any>;
}

export interface ComplianceAuditLog {
  id: string;
  userId?: string;
  action: string;
  dataType: string;
  legalBasis: string;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure' | 'warning';
  details: Record<string, any>;
  complianceOfficer?: string;
}

export interface IndianDataProtectionCompliance {
  // Personal Data Protection Bill (PDPB) compliance
  dataMinimization: boolean;
  purposeLimitation: boolean;
  storageMinimization: boolean;
  dataAccuracy: boolean;
  transparencyAndAccountability: boolean;
  
  // IT Rules 2021 compliance
  grievanceOfficerAppointed: boolean;
  monthlyComplianceReport: boolean;
  contentModerationCompliance: boolean;
  
  // RBI guidelines for payment data
  paymentDataLocalization: boolean;
  paymentDataRetention: boolean; // max 24 months
  
  lastAuditDate: Date;
  nextAuditDate: Date;
  complianceScore: number; // 0-100
}