/**
 * Users API module
 * Handles user authentication, registration, and profile management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertUserSchema } from '../../../shared/schema';
import { logger } from '../../lib/logger';
import { hashPassword, comparePasswords } from '../../auth';
import passport from 'passport';

// Create router for all user-related routes
const router = Router();

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get current user profile
router.get('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive information before sending
    const { password, ...userProfile } = user;
    res.json(userProfile);
  } catch (error: any) {
    logger.error('Failed to get user profile', 'users:getProfile', {}, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Update user profile
router.patch('/me', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Define allowed fields for update
    const updateSchema = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      emailReminders: z.boolean().optional(),
      weeklySummary: z.boolean().optional(),
      goalAchievement: z.boolean().optional(),
      reminderTime: z.string().optional(),
    });
    
    // Validate request body
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid user data',
        details: parseResult.error.format() 
      });
    }
    
    // Check for email uniqueness if changed
    if (parseResult.data.email) {
      const existingUser = await storage.getUserByEmail(parseResult.data.email);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }
    
    // Check for username uniqueness if changed
    if (parseResult.data.username) {
      const existingUser = await storage.getUserByUsername(parseResult.data.username);
      if (existingUser && existingUser.id !== userId) {
        return res.status(400).json({ error: 'Username already in use' });
      }
    }
    
    const updatedUser = await storage.updateUser(userId, parseResult.data);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Remove sensitive information before sending
    const { password, ...userProfile } = updatedUser;
    res.json(userProfile);
  } catch (error: any) {
    logger.error('Failed to update user profile', 'users:updateProfile', { body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

// Change password
router.post('/change-password', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Define schema for password change
    const passwordSchema = z.object({
      currentPassword: z.string(),
      newPassword: z.string().min(8),
    });
    
    // Validate request body
    const parseResult = passwordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid password data',
        details: parseResult.error.format() 
      });
    }
    
    // Get user with password
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValid = await comparePasswords(parseResult.data.currentPassword, user.password);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(parseResult.data.newPassword);
    
    // Update user password
    await storage.updateUser(userId, { password: hashedPassword });
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error: any) {
    logger.error('Failed to change password', 'users:changePassword', {}, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update notification preferences
router.patch('/notifications', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Define schema for notification preferences
    const notificationSchema = z.object({
      emailReminders: z.boolean().optional(),
      weeklySummary: z.boolean().optional(),
      goalAchievement: z.boolean().optional(),
      reminderTime: z.string().optional(),
    });
    
    // Validate request body
    const parseResult = notificationSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid notification data',
        details: parseResult.error.format() 
      });
    }
    
    const updatedUser = await storage.updateUser(userId, parseResult.data);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return only notification preferences
    const { emailReminders, weeklySummary, goalAchievement, reminderTime } = updatedUser;
    res.json({ emailReminders, weeklySummary, goalAchievement, reminderTime });
  } catch (error: any) {
    logger.error('Failed to update notification preferences', 'users:updateNotifications', 
      { body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

// Register a new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    // Validate request body with extended schema
    const registerSchema = insertUserSchema.extend({
      password: z.string().min(8),
      confirmPassword: z.string(),
    }).refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    });
    
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid registration data',
        details: parseResult.error.format() 
      });
    }
    
    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(parseResult.data.username);
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already in use' });
    }
    
    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(parseResult.data.email);
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already in use' });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(parseResult.data.password);
    
    // Create user without confirmPassword field
    const { confirmPassword, ...userData } = parseResult.data;
    const user = await storage.createUser({
      ...userData,
      password: hashedPassword,
    });
    
    // Remove password from response
    const { password, ...newUser } = user;
    
    // Set up default categories
    await storage.setupDefaultCategories(user.id);
    
    // Log in the user automatically
    req.login(user, (err) => {
      if (err) {
        logger.error('Error logging in after registration', 'users:register', {}, user.id, req.path, err);
        return res.status(500).json({ error: 'Failed to log in after registration' });
      }
      
      res.status(201).json({ user: newUser, message: 'Registration successful' });
    });
  } catch (error: any) {
    logger.error('Failed to register user', 'users:register', { body: req.body }, undefined, req.path, error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Log in a user
router.post('/login', (req: Request, res: Response, next: Function) => {
  passport.authenticate('local', (err: any, user: any, info: any) => {
    if (err) {
      logger.error('Error during login', 'users:login', { username: req.body.username }, undefined, req.path, err);
      return res.status(500).json({ error: 'An error occurred during login' });
    }
    
    if (!user) {
      return res.status(401).json({ error: info.message || 'Invalid credentials' });
    }
    
    req.login(user, (err) => {
      if (err) {
        logger.error('Error logging in', 'users:login', { username: req.body.username }, undefined, req.path, err);
        return res.status(500).json({ error: 'Failed to log in' });
      }
      
      // Remove password from response
      const { password, ...userProfile } = user;
      res.json({ user: userProfile, message: 'Login successful' });
    });
  })(req, res, next);
});

// Log out a user
router.post('/logout', (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    
    req.logout((err) => {
      if (err) {
        logger.error('Error logging out', 'users:logout', {}, userId, req.path, err);
        return res.status(500).json({ error: 'Failed to log out' });
      }
      
      res.json({ success: true, message: 'Logout successful' });
    });
  } catch (error: any) {
    logger.error('Failed to log out', 'users:logout', {}, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to log out' });
  }
});

export default router;