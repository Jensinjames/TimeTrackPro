/**
 * Categories API module
 * Handles CRUD operations for categories and subcategories
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertCategorySchema, insertSubcategorySchema } from '../../../shared/schema';
import { logger } from '../../lib/logger';
import { parsePagination, paginatedResponse } from '../../lib/middleware';

// Create router for all category-related routes
const router = Router();

// Auth middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// Get all categories for the authenticated user
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categories = await storage.getCategories(userId);
    res.json(categories);
  } catch (error: any) {
    logger.error('Failed to get categories', 'categories:list', {}, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// Create a new category
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Validate request body
    const parseResult = insertCategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid category data',
        details: parseResult.error.format() 
      });
    }
    
    // Add userId to category data
    const categoryData = {
      ...parseResult.data,
      userId
    };
    
    const category = await storage.createCategory(categoryData);
    res.status(201).json(category);
  } catch (error: any) {
    logger.error('Failed to create category', 'categories:create', req.body, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Get a specific category
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    const category = await storage.getCategory(categoryId);
    
    // Check if category exists and belongs to the user
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    res.json(category);
  } catch (error: any) {
    logger.error('Failed to get category', 'categories:get', { id: req.params.id }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get category' });
  }
});

// Update a category
router.patch('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Get existing category to check ownership
    const existingCategory = await storage.getCategory(categoryId);
    if (!existingCategory || existingCategory.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Validate request body with partial schema
    const updateSchema = insertCategorySchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid category data',
        details: parseResult.error.format() 
      });
    }
    
    const updatedCategory = await storage.updateCategory(categoryId, parseResult.data);
    res.json(updatedCategory);
  } catch (error: any) {
    logger.error('Failed to update category', 'categories:update', { id: req.params.id, body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete a category
router.delete('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categoryId = parseInt(req.params.id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Get existing category to check ownership
    const existingCategory = await storage.getCategory(categoryId);
    if (!existingCategory || existingCategory.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    await storage.deleteCategory(categoryId);
    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete category', 'categories:delete', { id: req.params.id }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

// ----- Subcategory routes -----

// Get all subcategories for a category
router.get('/:categoryId/subcategories', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Check if category belongs to user
    const category = await storage.getCategory(categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    const subcategories = await storage.getSubcategories(categoryId);
    res.json(subcategories);
  } catch (error: any) {
    logger.error('Failed to get subcategories', 'subcategories:list', { categoryId: req.params.categoryId }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get subcategories' });
  }
});

// Create a new subcategory
router.post('/:categoryId/subcategories', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const categoryId = parseInt(req.params.categoryId);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    
    // Check if category belongs to user
    const category = await storage.getCategory(categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Category not found' });
    }
    
    // Validate request body
    const parseResult = insertSubcategorySchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid subcategory data',
        details: parseResult.error.format() 
      });
    }
    
    // Add categoryId to subcategory data
    const subcategoryData = {
      ...parseResult.data,
      categoryId
    };
    
    const subcategory = await storage.createSubcategory(subcategoryData);
    res.status(201).json(subcategory);
  } catch (error: any) {
    logger.error('Failed to create subcategory', 'subcategories:create', { categoryId: req.params.categoryId, body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to create subcategory' });
  }
});

// Update a subcategory
router.patch('/subcategories/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const subcategoryId = parseInt(req.params.id);
    if (isNaN(subcategoryId)) {
      return res.status(400).json({ error: 'Invalid subcategory ID' });
    }
    
    // Get existing subcategory
    const existingSubcategory = await storage.getSubcategory(subcategoryId);
    if (!existingSubcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    // Check if the associated category belongs to the user
    const category = await storage.getCategory(existingSubcategory.categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    // Validate request body
    const updateSchema = insertSubcategorySchema.partial();
    const parseResult = updateSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ 
        error: 'Invalid subcategory data',
        details: parseResult.error.format() 
      });
    }
    
    const updatedSubcategory = await storage.updateSubcategory(subcategoryId, parseResult.data);
    res.json(updatedSubcategory);
  } catch (error: any) {
    logger.error('Failed to update subcategory', 'subcategories:update', { id: req.params.id, body: req.body }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to update subcategory' });
  }
});

// Delete a subcategory
router.delete('/subcategories/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    const subcategoryId = parseInt(req.params.id);
    if (isNaN(subcategoryId)) {
      return res.status(400).json({ error: 'Invalid subcategory ID' });
    }
    
    // Get existing subcategory
    const existingSubcategory = await storage.getSubcategory(subcategoryId);
    if (!existingSubcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    // Check if the associated category belongs to the user
    const category = await storage.getCategory(existingSubcategory.categoryId);
    if (!category || category.userId !== userId) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }
    
    await storage.deleteSubcategory(subcategoryId);
    res.status(204).send();
  } catch (error: any) {
    logger.error('Failed to delete subcategory', 'subcategories:delete', { id: req.params.id }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to delete subcategory' });
  }
});

export default router;