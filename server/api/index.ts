/**
 * API entry point
 * Registers all API routes and middleware
 */

import { Express } from 'express';
import { errorHandler, rateLimiter } from '../lib/middleware';
import { logger } from '../lib/logger';

// Import route modules
import categoriesRoutes from './categories';
import entriesRoutes from './entries';
import reportsRoutes from './reports';
import usersRoutes from './users';

/**
 * Register all API routes and middleware
 */
export function registerApiRoutes(app: Express): void {
  // Apply global middleware
  app.use('/api', rateLimiter);
  
  // Register API routes
  app.use('/api/categories', categoriesRoutes);
  app.use('/api/entries', entriesRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/users', usersRoutes);
  
  // Legacy routes for backward compatibility
  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Return user data without sensitive information
    const { password, ...user } = req.user;
    res.json(user);
  });
  
  app.get('/api/dashboard', async (req, res) => {
    // Forward to the new reports route
    const { date, from, to } = req.query;
    const queryParams = new URLSearchParams();
    
    if (date) queryParams.set('date', date as string);
    if (from) queryParams.set('from', from as string);
    if (to) queryParams.set('to', to as string);
    
    // Redirect to the new route
    req.url = `/api/reports/dashboard${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    logger.debug('Redirecting legacy dashboard request', 'api', { 
      originalUrl: '/api/dashboard', 
      newUrl: req.url 
    });
    
    app._router.handle(req, res);
  });
  
  // Global error handler
  app.use('/api', errorHandler);
  
  logger.info('API routes registered successfully', 'api');
}