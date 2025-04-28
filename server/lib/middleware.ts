/**
 * Common middleware for API routes
 * Includes pagination, rate limiting, and error handling
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

// Types for pagination
export interface PaginationOptions {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationOptions;
}

// Default pagination settings
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Parse pagination parameters from request query
 */
export const parsePagination = (req: Request): { page: number; limit: number } => {
  const page = Math.max(1, parseInt(req.query.page as string) || DEFAULT_PAGE);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(req.query.limit as string) || DEFAULT_LIMIT)
  );
  
  return { page, limit };
};

/**
 * Create a paginated response
 */
export const paginatedResponse = <T>(
  data: T[],
  totalCount: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(totalCount / limit);
  
  return {
    data,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages,
    },
  };
};

/**
 * Simple in-memory rate limiter
 * In production, you would use Redis or a dedicated rate limiting service
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute window
const RATE_LIMIT_MAX = 100; // 100 requests per window

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
  // Get client IP (or use authentication ID in a real app)
  const clientId = req.ip || 'unknown';
  const now = Date.now();
  const windowData = rateLimitMap.get(clientId) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  // Reset if window expired
  if (windowData.resetTime < now) {
    windowData.count = 0;
    windowData.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  // Increment count and check limit
  windowData.count += 1;
  rateLimitMap.set(clientId, windowData);
  
  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT_MAX.toString());
  res.setHeader('X-RateLimit-Remaining', Math.max(0, RATE_LIMIT_MAX - windowData.count).toString());
  res.setHeader('X-RateLimit-Reset', Math.ceil(windowData.resetTime / 1000).toString());
  
  // If exceeded, return 429
  if (windowData.count > RATE_LIMIT_MAX) {
    logger.warn(`Rate limit exceeded for client ${clientId}`, 'rateLimiter', { path: req.path });
    return res.status(429).json({
      error: 'Too many requests',
      message: 'Rate limit exceeded, please try again later',
    });
  }
  
  next();
};

/**
 * Global error handler middleware
 */
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  logger.error(
    'Unhandled exception',
    'errorHandler',
    { path: req.path, method: req.method },
    req.user?.id,
    req.path,
    err
  );
  
  // Return appropriate error response
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message || 'An error occurred',
    });
  }
  
  // Default to 500 for unexpected errors
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
};