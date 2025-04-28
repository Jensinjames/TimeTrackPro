/**
 * Entries API module
 * Handles daily entries and related time/habit records
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertDailyEntrySchema, insertTimeRecordSchema, insertHabitRecordSchema } from '../../../shared/schema';
import { logger } from '../../lib/logger';
import { parsePagination, paginatedResponse } from '../../lib/middleware';
import { parseISO, startOfDay, endOfDay, isValid } from 'date-fns';

// Create router for all entry-related routes
const router = Router();

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Helper to parse date from query parameters
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  
  const parsedDate = parseISO(dateStr);
  return isValid(parsedDate) ? parsedDate : null;
};

// Get entries in date range
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse date range from query parameters
    const fromDate = parseDate(req.query.from as string);
    const toDate = parseDate(req.query.to as string);
    
    if (req.query.from && req.query.to && (!fromDate || !toDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    // If no date parameters, use pagination
    if (!fromDate && !toDate) {
      const { page, limit } = parsePagination(req);
      // Implement paginated daily entries fetching
      // For now, return all entries with a warning
      logger.warn('Pagination for entries not yet implemented, returning all entries', 
        'entries:list', { userId }, userId, req.path);
      
      // Get entries for the user with details
      // TODO: Implement proper pagination
      const entries = await storage.getDailyEntriesInRange(userId, new Date(0), new Date());
      
      res.json(entries);
      return;
    }
    
    // Get entries in date range
    const entries = await storage.getDailyEntriesInRange(
      userId, 
      fromDate || new Date(0), 
      toDate || new Date()
    );
    
    res.json(entries);
  } catch (error: any) {
    logger.error('Failed to get entries', 'entries:list', { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get entries' });
  }
});

// Get entry by date
router.get('/date/:date', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const date = parseDate(req.params.date);
    if (!date) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    const entry = await storage.getDailyEntryByDate(userId, date);
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (error: any) {
    logger.error('Failed to get entry by date', 'entries:getByDate', { date: req.params.date }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// Get specific entry by ID
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }
    
    const entry = await storage.getDailyEntry(entryId);
    
    // Check if entry exists and belongs to user
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    res.json(entry);
  } catch (error: any) {
    logger.error('Failed to get entry', 'entries:get', { id: req.params.id }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get entry' });
  }
});

// Create a new entry
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Validate request body
    const parseResult = insertDailyEntrySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid entry data',
        details: parseResult.error.format() 
      });
    }
    
    // Ensure the entry belongs to the authenticated user
    const entryData = {
      ...parseResult.data,
      userId
    };
    
    // Ensure date is at the start of day for consistency
    if (entryData.date) {
      entryData.date = startOfDay(new Date(entryData.date));
    }
    
    // Check if entry already exists for this date
    const existingEntry = await storage.getDailyEntryByDate(userId, entryData.date);
    if (existingEntry) {
      return res.status(409).json({ 
        error: 'Entry already exists for this date',
        entryId: existingEntry.id
      });
    }
    
    const entry = await storage.createDailyEntry(entryData);
    res.status(201).json(entry);
  } catch (error: any) {
    logger.error('Failed to create entry', 'entries:create', req.body, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to create entry' });
  }
});

// Update an entry
router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const entryId = parseInt(req.params.id);
    if (isNaN(entryId)) {
      return res.status(400).json({ error: 'Invalid entry ID' });
    }
    
    // Get existing entry to check ownership
    const existingEntry = await storage.getDailyEntry(entryId);
    if (!existingEntry || existingEntry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Validate request body
    const updateSchema = insertDailyEntrySchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid entry data',
        details: parseResult.error.format() 
      });
    }
    
    // Ensure date is at the start of day for consistency
    if (parseResult.data.date) {
      parseResult.data.date = startOfDay(new Date(parseResult.data.date));
    }
    
    const updatedEntry = await storage.updateDailyEntry(entryId, parseResult.data);
    res.json(updatedEntry);
  } catch (error: any) {
    logger.error('Failed to update entry', 'entries:update', { id: req.params.id, body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update entry' });
  }
});

// ----- Time Records -----

// Create a time record
router.post('/time-records', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Validate request body
    const parseResult = insertTimeRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid time record data',
        details: parseResult.error.format() 
      });
    }
    
    // Check if entry belongs to user
    const entry = await storage.getDailyEntry(parseResult.data.entryId);
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const timeRecord = await storage.createTimeRecord(parseResult.data);
    res.status(201).json(timeRecord);
  } catch (error: any) {
    logger.error('Failed to create time record', 'timeRecords:create', req.body, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to create time record' });
  }
});

// Update a time record
router.put('/:entryId/time-records/:subcategoryId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const entryId = parseInt(req.params.entryId);
    const subcategoryId = parseInt(req.params.subcategoryId);
    
    if (isNaN(entryId) || isNaN(subcategoryId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }
    
    // Check if entry belongs to user
    const entry = await storage.getDailyEntry(entryId);
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Validate minutes
    const minutesSchema = z.object({ minutes: z.number().int().min(0) });
    const parseResult = minutesSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid minutes value',
        details: parseResult.error.format() 
      });
    }
    
    const updatedRecord = await storage.updateTimeRecord(
      entryId, 
      subcategoryId, 
      parseResult.data.minutes
    );
    
    if (!updatedRecord) {
      // Record doesn't exist, create it
      const newRecord = await storage.createTimeRecord({
        entryId,
        subcategoryId,
        minutes: parseResult.data.minutes
      });
      return res.json(newRecord);
    }
    
    res.json(updatedRecord);
  } catch (error: any) {
    logger.error('Failed to update time record', 'timeRecords:update', 
      { entryId: req.params.entryId, subcategoryId: req.params.subcategoryId, body: req.body }, 
      req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update time record' });
  }
});

// ----- Habit Records -----

// Create a habit record
router.post('/habit-records', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Validate request body
    const parseResult = insertHabitRecordSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid habit record data',
        details: parseResult.error.format() 
      });
    }
    
    // Check if entry belongs to user
    const entry = await storage.getDailyEntry(parseResult.data.entryId);
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    const habitRecord = await storage.createHabitRecord(parseResult.data);
    res.status(201).json(habitRecord);
  } catch (error: any) {
    logger.error('Failed to create habit record', 'habitRecords:create', req.body, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to create habit record' });
  }
});

// Update a habit record
router.put('/:entryId/habit-records/:subcategoryId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const entryId = parseInt(req.params.entryId);
    const subcategoryId = parseInt(req.params.subcategoryId);
    
    if (isNaN(entryId) || isNaN(subcategoryId)) {
      return res.status(400).json({ error: 'Invalid IDs' });
    }
    
    // Check if entry belongs to user
    const entry = await storage.getDailyEntry(entryId);
    if (!entry || entry.userId !== userId) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    
    // Validate completed flag
    const completedSchema = z.object({ completed: z.boolean() });
    const parseResult = completedSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid completed value',
        details: parseResult.error.format() 
      });
    }
    
    const updatedRecord = await storage.updateHabitRecord(
      entryId, 
      subcategoryId, 
      parseResult.data.completed
    );
    
    if (!updatedRecord) {
      // Record doesn't exist, create it
      const newRecord = await storage.createHabitRecord({
        entryId,
        subcategoryId,
        completed: parseResult.data.completed
      });
      return res.json(newRecord);
    }
    
    res.json(updatedRecord);
  } catch (error: any) {
    logger.error('Failed to update habit record', 'habitRecords:update', 
      { entryId: req.params.entryId, subcategoryId: req.params.subcategoryId, body: req.body }, 
      req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update habit record' });
  }
});

export default router;