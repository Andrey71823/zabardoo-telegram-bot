import { DataComplianceService } from '../services/compliance/DataComplianceService';
import { DataComplianceRepository } from '../repositories/DataComplianceRepository';
import { UserConsent, DataDeletionRequest } from '../models/DataCompliance';

// Mock the repository
jest.mock('../repositories/DataComplianceRepository');

describe('DataComplianceService', () => {
  let service: DataComplianceService;
  let mockRepository: jest.Mocked<DataComplianceRepository>;

  beforeEach(() => {
    mockRepository = new DataComplianceRepository(null as any) as jest.Mocked<DataComplianceRepository>;
    service = new DataComplianceService(mockRepository);
  });

  describe('Consent Management', () => {
    it('should grant user consent successfully', async () => {
      const mockConsent: UserConsent = {
        id: 'consent-1',
        userId: 'user-123',
        consentType: 'data_collection',
        granted: true,
        grantedAt: new Date(),
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        version: '1.0',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockRepository.revokeConsent.mockResolvedValue(undefined);
      mockRepository.createUserConsent.mockResolvedValue(mockConsent);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      const result = await service.grantConsent(
        'user-123',
        'data_collection',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(result).toEqual(mockConsent);
      expect(mockRepository.revokeConsent).toHaveBeenCalledWith('user-123', 'data_collection');
      expect(mockRepository.createUserConsent).toHaveBeenCalled();
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should revoke user consent successfully', async () => {
      mockRepository.revokeConsent.mockResolvedValue(undefined);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      await service.revokeConsent(
        'user-123',
        'data_collection',
        '192.168.1.1',
        'Mozilla/5.0'
      );

      expect(mockRepository.revokeConsent).toHaveBeenCalledWith('user-123', 'data_collection');
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should check consent status correctly', async () => {
      const mockConsents: UserConsent[] = [
        {
          id: 'consent-1',
          userId: 'user-123',
          consentType: 'data_collection',
          granted: true,
          grantedAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          version: '1.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockRepository.getActiveConsents.mockResolvedValue(mockConsents);

      const hasConsent = await service.checkConsent('user-123', 'data_collection');
      const noConsent = await service.checkConsent('user-123', 'marketing');

      expect(hasConsent).toBe(true);
      expect(noConsent).toBe(false);
    });
  });

  describe('Data Processing Records', () => {
    it('should record data processing activity', async () => {
      const mockRecord = {
        id: 'record-1',
        userId: 'user-123',
        dataType: 'personal' as const,
        processingPurpose: 'User registration',
        legalBasis: 'consent' as const,
        dataSource: 'registration_form',
        processingDate: new Date(),
        retentionPeriod: 365,
        deletionDate: new Date(),
        metadata: {},
        createdAt: new Date()
      };

      mockRepository.createProcessingRecord.mockResolvedValue(mockRecord);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      const result = await service.recordDataProcessing(
        'user-123',
        'personal',
        'User registration',
        'consent',
        'registration_form',
        365
      );

      expect(result).toEqual(mockRecord);
      expect(mockRepository.createProcessingRecord).toHaveBeenCalled();
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });
  });

  describe('Data Deletion', () => {
    it('should initiate data deletion request', async () => {
      const mockRequest: DataDeletionRequest = {
        id: 'del-1',
        userId: 'user-123',
        requestType: 'full_deletion',
        requestedData: ['personal_data', 'behavioral_data'],
        reason: 'User request',
        status: 'pending',
        requestedAt: new Date(),
        verificationToken: 'token-123',
        metadata: {}
      };

      mockRepository.createDeletionRequest.mockResolvedValue(mockRequest);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      const result = await service.initiateDataDeletion(
        'user-123',
        'full_deletion',
        ['personal_data', 'behavioral_data'],
        'User request'
      );

      expect(result).toEqual(mockRequest);
      expect(mockRepository.createDeletionRequest).toHaveBeenCalled();
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should process deletion request successfully', async () => {
      const mockRequest: DataDeletionRequest = {
        id: 'del-1',
        userId: 'user-123',
        requestType: 'anonymization',
        requestedData: ['personal_data'],
        status: 'pending',
        requestedAt: new Date(),
        verificationToken: 'token-123',
        metadata: {}
      };

      mockRepository.getDeletionRequest.mockResolvedValue(mockRequest);
      mockRepository.updateDeletionRequestStatus.mockResolvedValue(undefined);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      // Mock the database query for anonymization
      const mockDb = {
        query: jest.fn().mockResolvedValue({ rows: [] })
      };
      (mockRepository as any).db = mockDb;

      await service.processDeletionRequest('del-1');

      expect(mockRepository.getDeletionRequest).toHaveBeenCalledWith('del-1');
      expect(mockRepository.updateDeletionRequestStatus).toHaveBeenCalledWith('del-1', 'processing');
      expect(mockRepository.updateDeletionRequestStatus).toHaveBeenCalledWith('del-1', 'completed');
    });
  });

  describe('Data Export', () => {
    it('should export user data when consent exists', async () => {
      const mockConsents: UserConsent[] = [
        {
          id: 'consent-1',
          userId: 'user-123',
          consentType: 'data_collection',
          granted: true,
          grantedAt: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          version: '1.0',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      const mockUserData = {
        profile: { id: 'user-123', name: 'Test User' },
        consents: mockConsents,
        processingRecords: [],
        cashback: [],
        recommendations: []
      };

      mockRepository.getActiveConsents.mockResolvedValue(mockConsents);
      mockRepository.exportUserData.mockResolvedValue(mockUserData);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      const result = await service.exportUserData('user-123');

      expect(result).toEqual(mockUserData);
      expect(mockRepository.exportUserData).toHaveBeenCalledWith('user-123');
      expect(mockRepository.createAuditLog).toHaveBeenCalled();
    });

    it('should throw error when no consent exists', async () => {
      mockRepository.getActiveConsents.mockResolvedValue([]);

      await expect(service.exportUserData('user-123')).rejects.toThrow(
        'User has not consented to data collection'
      );
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance report', async () => {
      const mockAuditLogs = [
        {
          id: 'log-1',
          userId: 'user-123',
          action: 'consent_granted',
          dataType: 'personal',
          legalBasis: 'consent',
          timestamp: new Date(),
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          result: 'success' as const,
          details: {}
        }
      ];

      mockRepository.getAuditLogs.mockResolvedValue(mockAuditLogs);

      const report = await service.generateComplianceReport();

      expect(report).toHaveProperty('complianceScore');
      expect(report).toHaveProperty('dataMinimization');
      expect(report).toHaveProperty('purposeLimitation');
      expect(report).toHaveProperty('paymentDataLocalization');
      expect(report.complianceScore).toBe(100); // All logs are successful
    });
  });

  describe('Expired Data Processing', () => {
    it('should process expired data records', async () => {
      const mockExpiredRecords = [
        {
          id: 'record-1',
          userId: 'user-123',
          dataType: 'personal' as const,
          processingPurpose: 'Test',
          legalBasis: 'consent' as const,
          dataSource: 'test',
          processingDate: new Date(),
          retentionPeriod: 365,
          deletionDate: new Date(Date.now() - 86400000), // Yesterday
          metadata: {},
          createdAt: new Date()
        }
      ];

      mockRepository.getExpiredData.mockResolvedValue(mockExpiredRecords);
      mockRepository.createDeletionRequest.mockResolvedValue({
        id: 'del-1',
        userId: 'user-123',
        requestType: 'anonymization',
        requestedData: ['personal'],
        status: 'pending',
        requestedAt: new Date(),
        verificationToken: 'token-123',
        metadata: {}
      });
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      await service.processExpiredData();

      expect(mockRepository.getExpiredData).toHaveBeenCalled();
      expect(mockRepository.createDeletionRequest).toHaveBeenCalled();
    });
  });

  describe('Indian Compliance Specifics', () => {
    it('should validate PDPB compliance requirements', async () => {
      const report = await service.generateComplianceReport();

      // Check PDPB specific requirements
      expect(report).toHaveProperty('dataMinimization');
      expect(report).toHaveProperty('purposeLimitation');
      expect(report).toHaveProperty('storageMinimization');
      expect(report).toHaveProperty('dataAccuracy');
      expect(report).toHaveProperty('transparencyAndAccountability');
    });

    it('should validate IT Rules 2021 compliance', async () => {
      const report = await service.generateComplianceReport();

      // Check IT Rules 2021 specific requirements
      expect(report).toHaveProperty('grievanceOfficerAppointed');
      expect(report).toHaveProperty('monthlyComplianceReport');
      expect(report).toHaveProperty('contentModerationCompliance');
    });

    it('should validate RBI guidelines compliance', async () => {
      const report = await service.generateComplianceReport();

      // Check RBI specific requirements
      expect(report).toHaveProperty('paymentDataLocalization');
      expect(report).toHaveProperty('paymentDataRetention');
    });
  });

  describe('Error Handling', () => {
    it('should handle repository errors gracefully', async () => {
      mockRepository.createUserConsent.mockRejectedValue(new Error('Database error'));

      await expect(
        service.grantConsent('user-123', 'data_collection', '192.168.1.1', 'Mozilla/5.0')
      ).rejects.toThrow('Database error');
    });

    it('should handle deletion processing errors', async () => {
      const mockRequest: DataDeletionRequest = {
        id: 'del-1',
        userId: 'user-123',
        requestType: 'full_deletion',
        requestedData: ['personal_data'],
        status: 'pending',
        requestedAt: new Date(),
        verificationToken: 'token-123',
        metadata: {}
      };

      mockRepository.getDeletionRequest.mockResolvedValue(mockRequest);
      mockRepository.updateDeletionRequestStatus.mockResolvedValue(undefined);
      mockRepository.createAuditLog.mockResolvedValue(undefined);

      // Mock database error
      const mockDb = {
        query: jest.fn().mockRejectedValue(new Error('Database error'))
      };
      (mockRepository as any).db = mockDb;

      await service.processDeletionRequest('del-1');

      // Should update status to rejected
      expect(mockRepository.updateDeletionRequestStatus).toHaveBeenCalledWith(
        'del-1',
        'rejected',
        expect.stringContaining('Processing error')
      );
    });
  });

  describe('Data Retention Policies', () => {
    it('should apply correct retention periods for different data types', async () => {
      const testCases = [
        { dataType: 'personal', expectedPolicy: '2 years for inactive users' },
        { dataType: 'sensitive', expectedPolicy: '1 year after purpose fulfillment' },
        { dataType: 'financial', expectedPolicy: '7 years (RBI requirement)' },
        { dataType: 'behavioral', expectedPolicy: '1 year for analytics' },
        { dataType: 'location', expectedPolicy: '6 months unless consent' }
      ];

      for (const testCase of testCases) {
        mockRepository.createProcessingRecord.mockResolvedValue({
          id: 'record-1',
          userId: 'user-123',
          dataType: testCase.dataType as any,
          processingPurpose: 'Test',
          legalBasis: 'consent',
          dataSource: 'test',
          processingDate: new Date(),
          retentionPeriod: 365,
          deletionDate: new Date(),
          metadata: { retentionPolicy: testCase.expectedPolicy },
          createdAt: new Date()
        });

        const result = await service.recordDataProcessing(
          'user-123',
          testCase.dataType as any,
          'Test purpose',
          'consent',
          'test_source'
        );

        expect(result.metadata.retentionPolicy).toBe(testCase.expectedPolicy);
      }
    });
  });
});