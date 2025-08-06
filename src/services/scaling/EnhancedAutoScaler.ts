import { EventEmitter } from 'events';
import { logger } from '../../config/logger';
import { enhancedLoadBalancer, ServerInstance } from '../loadbalancer/EnhancedLoadBalancer';

export interface ScalingRule {
  id: string;
  name: string;
  metric: 'cpu' | 'memory' | 'connections' | 'response_time' | 'requests_per_second' | 'error_rate';
  threshold: number;
  operator: 'greater_than' | 'less_than';