import { Request, Response, NextFunction } from 'express';
import { abusePreventionService } from '../services/security/AbusePreventionService';
import { ddosProtectionService } from '../services/security/DDoSProtectionService';
import { logger } from '../config/logger';

// Extend Request interface for abuse protection
declare global {
  namespace Express {
    interface Request {
      abuseProtection?: {
        riskScore: number;
        flags: string[];
        blocked: boolean;
        reason?: string;
      };
    }
  }
}

/**
 * Main abuse protection middleware
 */
export const abuseProtection = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // Prepare request data
    const requestData = {
      ip: req.ip,
      userId: req.user?.id,
      userAgent: req.get('User-Agent') || '',
      endpoint: req.path,
      method: req.method,
      body: req.body,
      headers: req.headers as { [key: string]: string }
    };

    // Check abuse prevention service
    const abuseCheck = await abusePreventionService.checkRequest(requestData);
    
    if (!abuseCheck.allowed) {
      logger.warn(`Abuse protection blocked request from ${req.ip}`, {
        reason: abuseCheck.reason,
        endpoint: req.path,
        userAgent: req.get('User-Agent'),
        userId: req.user?.id
      });

      return res.status(429).json({
        error: 'Request blocked',
        message: abuseCheck.reason || 'Your request has been blocked due to suspicious activity',
        retryAfter: abuseCheck.blockDuration ? Math.ceil(abuseCheck.blockDuration / 1000) : undefined,
        timestamp: new Date().toISOString()
      });
    }

    // Check DDoS protection
    const ddosCheck = ddosProtectionService.analyzeRequest(requestData);
    
    if (!ddosCheck.allowed) {
      logger.warn(`DDoS protection blocked request from ${req.ip}`, {
        reason: ddosCheck.reason,
        action: ddosCheck.action,
        endpoint: req.path
      });

      const statusCode = ddosCheck.action === 'challenge_required' ? 403 : 429;
      
      return res.status(statusCode).json({
        error: 'Request blocked',
        message: ddosCheck.reason || 'Your request has been blocked due to suspicious traffic patterns',
        action: ddosCheck.action,
        timestamp: new Date().toISOString()
      });
    }

    // Add abuse protection info to request
    req.abuseProtection = {
      riskScore: calculateRiskScore(requestData),
      flags: [],
      blocked: false
    };

    // Log processing time
    const processingTime = Date.now() - startTime;
    if (processingTime > 100) {
      logger.debug(`Abuse protection processing took ${processingTime}ms for ${req.ip}`);
    }

    next();
  } catch (error) {
    logger.error('Abuse protection middleware error:', error);
    // Fail open - don't block legitimate requests due to errors
    next();
  }
};

/**
 * Calculate risk score for request
 */
function calculateRiskScore(request: {
  ip: string;
  userId?: string;
  userAgent: string;
  endpoint: string;
  method: string;
}): number {
  let score = 0;

  // User agent analysis
  const userAgent = request.userAgent.toLowerCase();
  if (!userAgent || userAgent.length < 10) {
    score += 30;
  } else if (userAgent.includes('bot') || userAgent.includes('crawler')) {
    score += 50;
  }

  // Endpoint analysis
  if (request.endpoint.includes('admin')) {
    score += 20;
  }
  if (request.endpoint.includes('api')) {
    score += 10;
  }

  // Method analysis
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    score += 15;
  }

  // Anonymous user
  if (!request.userId) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Rate limiting middleware with abuse protection
 */
export const rateLimitWithProtection = (options: {
  windowMs?: number;
  maxRequests?: number;
  skipSuccessfulRequests?: boolean;
}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    skipSuccessfulRequests: false,
    ...options
  };

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = req.user?.id || req.ip;
      const now = Date.now();
      
      // This would integrate with the rate limiting logic in AbusePreventionService
      // For now, we'll use a simple implementation
      
      next();
    } catch (error) {
      logger.error('Rate limit middleware error:', error);
      next();
    }
  };
};

/**
 * Bot detection middleware
 */
export const botDetection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const userAgent = req.get('User-Agent') || '';
    const suspiciousBotPatterns = [
      /bot/i, /crawler/i, /spider/i, /scraper/i,
      /curl/i, /wget/i, /python-requests/i,
      /scrapy/i, /selenium/i, /phantomjs/i
    ];

    const isSuspiciousBot = suspiciousBotPatterns.some(pattern => pattern.test(userAgent));
    
    if (isSuspiciousBot) {
      logger.warn(`Bot detected: ${req.ip} - ${userAgent}`);
      
      return res.status(403).json({
        error: 'Bot detected',
        message: 'Automated requests are not allowed',
        timestamp: new Date().toISOString()
      });
    }

    // Check for missing user agent
    if (!userAgent || userAgent.length < 10) {
      logger.warn(`Suspicious user agent: ${req.ip} - ${userAgent}`);
      
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Valid user agent required',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Bot detection middleware error:', error);
    next();
  }
};

/**
 * Spam detection middleware
 */
export const spamDetection = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return next();
    }

    const content = JSON.stringify(req.body).toLowerCase();
    
    // Common spam keywords
    const spamKeywords = [
      'viagra', 'cialis', 'casino', 'lottery', 'winner',
      'congratulations', 'click here', 'free money',
      'make money fast', 'work from home', 'weight loss',
      'diet pills', 'crypto', 'bitcoin'
    ];

    const spamCount = spamKeywords.filter(keyword => content.includes(keyword)).length;
    
    if (spamCount >= 3) {
      logger.warn(`Spam detected: ${req.ip} - ${spamCount} spam keywords found`);
      
      return res.status(400).json({
        error: 'Spam detected',
        message: 'Your content appears to be spam',
        timestamp: new Date().toISOString()
      });
    }

    // Check for excessive repetition
    const words = content.split(/\s+/);
    const wordCount = new Map<string, number>();
    
    words.forEach(word => {
      if (word.length > 3) {
        wordCount.set(word, (wordCount.get(word) || 0) + 1);
      }
    });

    const maxRepetition = Math.max(...Array.from(wordCount.values()));
    if (maxRepetition > 10) {
      logger.warn(`Excessive repetition detected: ${req.ip} - max repetition: ${maxRepetition}`);
      
      return res.status(400).json({
        error: 'Spam detected',
        message: 'Excessive repetition detected in content',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Spam detection middleware error:', error);
    next();
  }
};

/**
 * Injection protection middleware
 */
export const injectionProtection = (req: Request, res: Response, next: NextFunction) => {
  try {
    const content = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params
    }).toLowerCase();

    // SQL injection patterns
    const sqlPatterns = [
      /union\s+select/i, /drop\s+table/i, /delete\s+from/i,
      /insert\s+into/i, /update\s+set/i, /exec\s*\(/i,
      /'.*or.*'.*=.*'/i, /".*or.*".*=.*"/i,
      /1\s*=\s*1/i, /'\s*or\s*'1'\s*=\s*'1/i
    ];

    // XSS patterns
    const xssPatterns = [
      /<script/i, /<\/script>/i, /javascript:/i,
      /onload\s*=/i, /onerror\s*=/i, /onclick\s*=/i,
      /alert\s*\(/i, /document\.cookie/i, /eval\s*\(/i
    ];

    // Command injection patterns
    const cmdPatterns = [
      /\$\(/i, /`.*`/i, /&&/i, /\|\|/i,
      /;cat/i, /;ls/i, /;pwd/i,
      /\/etc\/passwd/i, /\/bin\/sh/i, /cmd\.exe/i
    ];

    const allPatterns = [...sqlPatterns, ...xssPatterns, ...cmdPatterns];
    const detectedPatterns = allPatterns.filter(pattern => pattern.test(content));

    if (detectedPatterns.length > 0) {
      logger.error(`Injection attempt detected: ${req.ip}`, {
        patterns: detectedPatterns.length,
        endpoint: req.path,
        userAgent: req.get('User-Agent')
      });

      // Block IP for injection attempts
      abusePreventionService.blockEntity({
        type: 'ip',
        value: req.ip,
        reason: 'Injection attempt detected',
        severity: 'temporary',
        duration: 3600000, // 1 hour
        blockedBy: 'system'
      });

      return res.status(400).json({
        error: 'Malicious content detected',
        message: 'Your request contains potentially malicious content',
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    logger.error('Injection protection middleware error:', error);
    next();
  }
};

/**
 * Geo-blocking middleware
 */
export const geoBlocking = (blockedCountries: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // In a real implementation, you would use a GeoIP service
      // For now, we'll skip this check
      const country = req.get('CF-IPCountry') || req.get('X-Country-Code');
      
      if (country && blockedCountries.includes(country.toUpperCase())) {
        logger.warn(`Geo-blocked request: ${req.ip} from ${country}`);
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Access from your location is not permitted',
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      logger.error('Geo-blocking middleware error:', error);
      next();
    }
  };
};

/**
 * Honeypot middleware - detects bots that fill hidden fields
 */
export const honeypot = (fieldName: string = 'website') => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (req.body && req.body[fieldName]) {
        logger.warn(`Honeypot triggered: ${req.ip} filled field ${fieldName}`);
        
        // Block IP for honeypot trigger
        abusePreventionService.blockEntity({
          type: 'ip',
          value: req.ip,
          reason: 'Honeypot field filled (bot behavior)',
          severity: 'temporary',
          duration: 1800000, // 30 minutes
          blockedBy: 'system'
        });

        return res.status(400).json({
          error: 'Invalid request',
          message: 'Request validation failed',
          timestamp: new Date().toISOString()
        });
      }

      next();
    } catch (error) {
      logger.error('Honeypot middleware error:', error);
      next();
    }
  };
};

/**
 * Challenge-response middleware for suspicious requests
 */
export const challengeResponse = (req: Request, res: Response, next: NextFunction) => {
  try {
    const riskScore = req.abuseProtection?.riskScore || 0;
    
    // Require challenge for high-risk requests
    if (riskScore > 70) {
      const challengeToken = req.get('X-Challenge-Token');
      
      if (!challengeToken) {
        return res.status(403).json({
          error: 'Challenge required',
          message: 'Please complete the security challenge',
          challengeRequired: true,
          timestamp: new Date().toISOString()
        });
      }

      // Verify challenge token (simplified)
      if (!verifyChallengeToken(challengeToken)) {
        return res.status(403).json({
          error: 'Invalid challenge',
          message: 'Security challenge verification failed',
          timestamp: new Date().toISOString()
        });
      }
    }

    next();
  } catch (error) {
    logger.error('Challenge-response middleware error:', error);
    next();
  }
};

/**
 * Verify challenge token (simplified implementation)
 */
function verifyChallengeToken(token: string): boolean {
  // In a real implementation, this would verify a CAPTCHA or similar challenge
  // For now, we'll accept any non-empty token
  return token && token.length > 10;
}

/**
 * Request fingerprinting middleware
 */
export const requestFingerprinting = (req: Request, res: Response, next: NextFunction) => {
  try {
    const fingerprint = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      acceptLanguage: req.get('Accept-Language'),
      acceptEncoding: req.get('Accept-Encoding'),
      connection: req.get('Connection'),
      timestamp: Date.now()
    };

    // Store fingerprint for analysis (in a real implementation)
    req.fingerprint = fingerprint;

    next();
  } catch (error) {
    logger.error('Request fingerprinting middleware error:', error);
    next();
  }
};

/**
 * Suspicious activity logger
 */
export const suspiciousActivityLogger = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log suspicious responses
    if (res.statusCode >= 400) {
      const riskScore = req.abuseProtection?.riskScore || 0;
      
      if (riskScore > 50 || res.statusCode === 429 || res.statusCode === 403) {
        logger.warn('Suspicious activity detected', {
          ip: req.ip,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          userAgent: req.get('User-Agent'),
          riskScore,
          userId: req.user?.id
        });
      }
    }

    return originalSend.call(this, data);
  };

  next();
};

export default {
  abuseProtection,
  rateLimitWithProtection,
  botDetection,
  spamDetection,
  injectionProtection,
  geoBlocking,
  honeypot,
  challengeResponse,
  requestFingerprinting,
  suspiciousActivityLogger
};