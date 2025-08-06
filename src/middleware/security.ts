import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { authenticationService } from '../services/security/AuthenticationService';
import { authorizationService } from '../services/security/AuthorizationService';
import { logger } from '../config/logger';

// Extend Request interface to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
        permissions: string[];
      };
      sessionId?: string;
      rateLimitInfo?: {
        limit: number;
        remaining: number;
        reset: Date;
      };
    }
  }
}

/**
 * Authentication middleware
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'Please provide a valid Bearer token'
      });
    }

    const token = authHeader.substring(7);
    const verification = await authenticationService.verifyToken(token);

    if (!verification.valid) {
      return res.status(401).json({
        error: 'Invalid token',
        message: verification.error || 'Token verification failed'
      });
    }

    // Add user information to request
    req.user = {
      id: verification.user!.id,
      username: verification.user!.username,
      role: verification.user!.role,
      permissions: authorizationService.getUserPermissions(verification.user!.id)
    };

    // Extract session ID from headers if present
    req.sessionId = req.headers['x-session-id'] as string;

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    res.status(500).json({
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

/**
 * Authorization middleware factory
 */
export const authorize = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Authentication required',
          message: 'User not authenticated'
        });
      }

      // Check access with full context
      const accessRequest = {
        userId: req.user.id,
        resource,
        action,
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          additionalData: {
            method: req.method,
            path: req.path,
            query: req.query,
            sessionId: req.sessionId
          }
        }
      };

      const decision = await authorizationService.checkAccess(accessRequest);

      if (!decision.allowed) {
        logger.warn(`Authorization denied: ${req.user.username} tried to ${action} ${resource} - ${decision.reason}`);
        
        return res.status(403).json({
          error: 'Access denied',
          message: decision.reason,
          resource,
          action
        });
      }

      // Log successful authorization for audit
      logger.debug(`Authorization granted: ${req.user.username} can ${action} ${resource}`);
      
      next();
    } catch (error) {
      logger.error('Authorization middleware error:', error);
      res.status(500).json({
        error: 'Authorization error',
        message: 'Internal server error during authorization'
      });
    }
  };
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      logger.warn(`Role authorization denied: ${req.user.username} (${req.user.role}) tried to access resource requiring roles: ${allowedRoles.join(', ')}`);
      
      return res.status(403).json({
        error: 'Insufficient privileges',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
    }

    if (!req.user.permissions.includes(permission)) {
      logger.warn(`Permission authorization denied: ${req.user.username} tried to access resource requiring permission: ${permission}`);
      
      return res.status(403).json({
        error: 'Insufficient permissions',
        message: `This action requires the permission: ${permission}`,
        userPermissions: req.user.permissions,
        requiredPermission: permission
      });
    }

    next();
  };
};

/**
 * Rate limiting middleware factory
 */
export const createRateLimit = (options: {
  windowMs?: number;
  max?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    handler: (req: Request, res: Response) => {
      logger.warn(`Rate limit exceeded: ${req.user?.username || req.ip} - ${req.method} ${req.path}`);
      
      res.status(429).json({
        error: 'Rate limit exceeded',
        message: options.message || 'Too many requests, please try again later.',
        retryAfter: Math.round(options.windowMs! / 1000)
      });
    },
    onLimitReached: (req: Request, res: Response, optionsUsed: any) => {
      logger.warn(`Rate limit reached: ${req.user?.username || req.ip} - limit: ${optionsUsed.max}, window: ${optionsUsed.windowMs}ms`);
    },
    ...options
  };

  const limiter = rateLimit(defaultOptions);

  // Wrap to add rate limit info to request
  return (req: Request, res: Response, next: NextFunction) => {
    limiter(req, res, (err) => {
      if (err) return next(err);
      
      // Add rate limit info to request
      req.rateLimitInfo = {
        limit: parseInt(res.get('X-RateLimit-Limit') || '0'),
        remaining: parseInt(res.get('X-RateLimit-Remaining') || '0'),
        reset: new Date(parseInt(res.get('X-RateLimit-Reset') || '0') * 1000)
      };
      
      next();
    });
  };
};

/**
 * Security headers middleware
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * CORS middleware with security considerations
 */
export const secureCORS = (allowedOrigins: string[] = []) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.get('Origin');
    
    // Allow requests without origin (e.g., mobile apps, Postman)
    if (!origin) {
      res.header('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    } else {
      logger.warn(`CORS blocked request from origin: ${origin}`);
      return res.status(403).json({
        error: 'CORS policy violation',
        message: 'Origin not allowed'
      });
    }

    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Session-ID');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  };
};

/**
 * Input validation middleware
 */
export const validateInput = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Basic input sanitization
      if (req.body) {
        req.body = sanitizeObject(req.body);
      }
      
      if (req.query) {
        req.query = sanitizeObject(req.query);
      }

      // Here you would typically use a validation library like Joi or Yup
      // For now, we'll do basic validation
      
      next();
    } catch (error) {
      logger.error('Input validation error:', error);
      res.status(400).json({
        error: 'Invalid input',
        message: 'Request data validation failed'
      });
    }
  };
};

/**
 * Sanitize object to prevent XSS and injection attacks
 */
function sanitizeObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitized: any = {};
  for (const [key, value] of Object.entries(obj)) {
    const sanitizedKey = sanitizeString(key);
    sanitized[sanitizedKey] = sanitizeObject(value);
  }

  return sanitized;
}

/**
 * Sanitize string to prevent XSS
 */
function sanitizeString(str: any): any {
  if (typeof str !== 'string') {
    return str;
  }

  return str
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Request logging middleware
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    user: req.user?.username,
    sessionId: req.sessionId
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger.log(level, `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`, {
      ip: req.ip,
      user: req.user?.username,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  });

  next();
};

/**
 * Error handling middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    user: req.user?.username
  });

  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    error: 'Internal server error',
    message: isDevelopment ? err.message : 'Something went wrong',
    ...(isDevelopment && { stack: err.stack })
  });
};

/**
 * API key authentication middleware
 */
export const authenticateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.get('X-API-Key');
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Please provide a valid API key in X-API-Key header'
    });
  }

  // Validate API key (in real implementation, check against database)
  const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];
  
  if (!validApiKeys.includes(apiKey)) {
    logger.warn(`Invalid API key used: ${apiKey.substring(0, 8)}...`);
    
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }

  // Add API key info to request
  req.user = {
    id: 'api-user',
    username: 'API User',
    role: 'api',
    permissions: ['api:*']
  };

  next();
};

/**
 * IP whitelist middleware
 */
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip;
    
    if (!allowedIPs.includes(clientIP)) {
      logger.warn(`IP not whitelisted: ${clientIP}`);
      
      return res.status(403).json({
        error: 'IP not allowed',
        message: 'Your IP address is not authorized to access this resource'
      });
    }

    next();
  };
};

/**
 * Content type validation middleware
 */
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentType = req.get('Content-Type');
    
    if (req.method !== 'GET' && req.method !== 'DELETE') {
      if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
        return res.status(415).json({
          error: 'Unsupported media type',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
          received: contentType
        });
      }
    }

    next();
  };
};

// Pre-configured rate limiters for different endpoints
export const rateLimiters = {
  // Strict rate limiting for authentication endpoints
  auth: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true
  }),

  // General API rate limiting
  api: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many API requests, please try again later.'
  }),

  // Lenient rate limiting for public endpoints
  public: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests per window
    message: 'Too many requests, please try again later.'
  }),

  // Strict rate limiting for admin endpoints
  admin: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // 50 requests per window
    message: 'Too many admin requests, please try again later.'
  })
};

export default {
  authenticate,
  authorize,
  requireRole,
  requirePermission,
  createRateLimit,
  securityHeaders,
  secureCORS,
  validateInput,
  requestLogger,
  errorHandler,
  authenticateApiKey,
  ipWhitelist,
  validateContentType,
  rateLimiters
};