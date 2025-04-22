import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { addDays, startOfDay, endOfDay, format } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Get categories for the current user
  app.get("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const categories = await storage.getCategories(req.user.id);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Create a new category
  app.post("/api/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const category = await storage.createCategory({
        ...req.body,
        userId: req.user.id
      });
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  // Update a category
  app.patch("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const categoryId = parseInt(req.params.id);
    
    try {
      // Check if the category belongs to the user
      const category = await storage.getCategory(categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const updatedCategory = await storage.updateCategory(categoryId, req.body);
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  // Delete a category
  app.delete("/api/categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const categoryId = parseInt(req.params.id);
    
    try {
      // Check if the category belongs to the user
      const category = await storage.getCategory(categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      await storage.deleteCategory(categoryId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Create a new subcategory
  app.post("/api/subcategories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Check if the category belongs to the user
      const category = await storage.getCategory(req.body.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      const subcategory = await storage.createSubcategory(req.body);
      res.status(201).json(subcategory);
    } catch (error) {
      console.error("Error creating subcategory:", error);
      res.status(500).json({ message: "Failed to create subcategory" });
    }
  });

  // Update a subcategory
  app.patch("/api/subcategories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const subcategoryId = parseInt(req.params.id);
    
    try {
      // Check if the subcategory belongs to the user
      const subcategory = await storage.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      const category = await storage.getCategory(subcategory.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      const updatedSubcategory = await storage.updateSubcategory(subcategoryId, req.body);
      res.json(updatedSubcategory);
    } catch (error) {
      console.error("Error updating subcategory:", error);
      res.status(500).json({ message: "Failed to update subcategory" });
    }
  });

  // Delete a subcategory
  app.delete("/api/subcategories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const subcategoryId = parseInt(req.params.id);
    
    try {
      // Check if the subcategory belongs to the user
      const subcategory = await storage.getSubcategory(subcategoryId);
      if (!subcategory) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      const category = await storage.getCategory(subcategory.categoryId);
      if (!category || category.userId !== req.user.id) {
        return res.status(404).json({ message: "Subcategory not found" });
      }
      
      await storage.deleteSubcategory(subcategoryId);
      res.sendStatus(204);
    } catch (error) {
      console.error("Error deleting subcategory:", error);
      res.status(500).json({ message: "Failed to delete subcategory" });
    }
  });

  // Get daily entry by date
  app.get("/api/entries", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const dateParam = req.query.date as string || new Date().toISOString();
    const date = new Date(dateParam);
    
    try {
      const entry = await storage.getDailyEntryByDate(req.user.id, date);
      
      if (!entry) {
        // Return empty data structure if no entry exists
        return res.json({
          id: null,
          date: date.toISOString(),
          userId: req.user.id,
          sleepHours: 0,
          dailyScore: 0,
          motivationLevel: 0,
          healthBalance: 0,
          timeRecords: [],
          habitRecords: []
        });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error fetching daily entry:", error);
      res.status(500).json({ message: "Failed to fetch daily entry" });
    }
  });

  // Create or update daily entry
  app.post("/api/entries", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { date, timeRecords, habitRecords, sleepHours } = req.body;
    const entryDate = new Date(date);
    
    try {
      // First check if entry already exists
      let entry = await storage.getDailyEntryByDate(req.user.id, entryDate);
      
      // Calculate metrics
      const dailyScore = calculateDailyScore(timeRecords, habitRecords);
      const motivationLevel = calculateMotivationLevel(timeRecords, habitRecords);
      const healthBalance = calculateHealthBalance(timeRecords, habitRecords);
      
      if (!entry) {
        // Create new entry
        entry = await storage.createDailyEntry({
          userId: req.user.id,
          date: entryDate,
          sleepHours: sleepHours || 0,
          dailyScore,
          motivationLevel,
          healthBalance
        });
      } else {
        // Update existing entry
        entry = await storage.updateDailyEntry(entry.id, {
          sleepHours: sleepHours || 0,
          dailyScore,
          motivationLevel,
          healthBalance
        }) as DailyEntry;
      }
      
      // Process time records
      if (timeRecords && Array.isArray(timeRecords)) {
        for (const record of timeRecords) {
          await storage.updateTimeRecord(entry.id, record.subcategoryId, record.minutes);
        }
      }
      
      // Process habit records
      if (habitRecords && Array.isArray(habitRecords)) {
        for (const record of habitRecords) {
          await storage.updateHabitRecord(entry.id, record.subcategoryId, record.completed);
        }
      }
      
      // Fetch the updated entry with all records
      const updatedEntry = await storage.getDailyEntryByDate(req.user.id, entryDate);
      res.json(updatedEntry);
    } catch (error) {
      console.error("Error saving daily entry:", error);
      res.status(500).json({ message: "Failed to save daily entry" });
    }
  });

  // Get dashboard data
  app.get("/api/dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const dateParam = req.query.date as string || new Date().toISOString();
    const date = new Date(dateParam);
    
    try {
      const dashboardData = await storage.getDashboardData(req.user.id, date);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch dashboard data" });
    }
  });
  
  // Get history data (last 30 days)
  app.get("/api/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 30); // Last 30 days
      
      // Get all daily entries for date range
      const entries = await storage.getDailyEntriesInRange(req.user.id, start, end);
      
      res.json(entries);
    } catch (error) {
      console.error("Error fetching history data:", error);
      res.status(500).json({ message: "Failed to fetch history data" });
    }
  });
  
  // Create time record
  app.post("/api/time-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { entryId, subcategoryId, minutes } = req.body;
      
      // Validate entry belongs to user
      const entry = await storage.getDailyEntry(entryId);
      if (!entry || entry.userId !== req.user.id) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const record = await storage.createTimeRecord({
        entryId,
        subcategoryId,
        minutes
      });
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create time record:", error);
      res.status(500).json({ message: "Failed to create time record" });
    }
  });
  
  // Create habit record
  app.post("/api/habit-records", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const { entryId, subcategoryId, completed } = req.body;
      
      // Validate entry belongs to user
      const entry = await storage.getDailyEntry(entryId);
      if (!entry || entry.userId !== req.user.id) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const record = await storage.createHabitRecord({
        entryId,
        subcategoryId,
        completed
      });
      
      res.status(201).json(record);
    } catch (error) {
      console.error("Failed to create habit record:", error);
      res.status(500).json({ message: "Failed to create habit record" });
    }
  });
  
  // Update time record
  app.put("/api/entries/:entryId/time-records/:subcategoryId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const entryId = parseInt(req.params.entryId);
      const subcategoryId = parseInt(req.params.subcategoryId);
      const { minutes } = req.body;
      
      // Validate entry belongs to user
      const entry = await storage.getDailyEntry(entryId);
      if (!entry || entry.userId !== req.user.id) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const record = await storage.updateTimeRecord(entryId, subcategoryId, minutes);
      
      if (!record) {
        return res.status(404).json({ message: "Time record not found" });
      }
      
      res.status(200).json(record);
    } catch (error) {
      console.error("Failed to update time record:", error);
      res.status(500).json({ message: "Failed to update time record" });
    }
  });
  
  // Update habit record
  app.put("/api/entries/:entryId/habit-records/:subcategoryId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const entryId = parseInt(req.params.entryId);
      const subcategoryId = parseInt(req.params.subcategoryId);
      const { completed } = req.body;
      
      // Validate entry belongs to user
      const entry = await storage.getDailyEntry(entryId);
      if (!entry || entry.userId !== req.user.id) {
        return res.status(404).json({ message: "Entry not found" });
      }
      
      const record = await storage.updateHabitRecord(entryId, subcategoryId, completed);
      
      if (!record) {
        return res.status(404).json({ message: "Habit record not found" });
      }
      
      res.status(200).json(record);
    } catch (error) {
      console.error("Failed to update habit record:", error);
      res.status(500).json({ message: "Failed to update habit record" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Helper functions for calculating metrics
function calculateDailyScore(timeRecords: any[], habitRecords: any[]): number {
  // Basic implementation - can be enhanced with more sophisticated algorithm
  if (!timeRecords?.length && !habitRecords?.length) return 0;
  
  let timeScore = 0;
  let timeTotal = 0;
  
  if (timeRecords?.length) {
    for (const record of timeRecords) {
      // Each record contributes to overall score
      timeScore += record.minutes;
      timeTotal += 1;
    }
  }
  
  let habitScore = 0;
  let habitTotal = 0;
  
  if (habitRecords?.length) {
    for (const record of habitRecords) {
      if (record.completed) habitScore += 1;
      habitTotal += 1;
    }
  }
  
  // Calculate final score
  const totalScore = timeTotal > 0 ? (timeScore / (timeTotal * 60)) * 50 : 0;
  const totalHabitScore = habitTotal > 0 ? (habitScore / habitTotal) * 50 : 0;
  
  return Math.min(Math.round(totalScore + totalHabitScore), 100);
}

function calculateMotivationLevel(timeRecords: any[], habitRecords: any[]): number {
  // Similar to daily score but weighted differently
  if (!timeRecords?.length && !habitRecords?.length) return 0;
  
  let timeScore = 0;
  let timeTotal = 0;
  
  if (timeRecords?.length) {
    for (const record of timeRecords) {
      timeScore += record.minutes;
      timeTotal += 1;
    }
  }
  
  let habitScore = 0;
  let habitTotal = 0;
  
  if (habitRecords?.length) {
    for (const record of habitRecords) {
      if (record.completed) habitScore += 1;
      habitTotal += 1;
    }
  }
  
  // Calculate final motivation level
  const totalTimeScore = timeTotal > 0 ? (timeScore / (timeTotal * 60)) * 60 : 0;
  const totalHabitScore = habitTotal > 0 ? (habitScore / habitTotal) * 40 : 0;
  
  return Math.min(Math.round(totalTimeScore + totalHabitScore), 100);
}

function calculateHealthBalance(timeRecords: any[], habitRecords: any[]): number {
  // Focus more on health-related habits
  if (!habitRecords?.length) return 0;
  
  let healthScore = 0;
  let healthTotal = 0;
  
  for (const record of habitRecords) {
    if (record.completed) healthScore += 1;
    healthTotal += 1;
  }
  
  return healthTotal > 0 ? Math.round((healthScore / healthTotal) * 100) : 0;
}

import { DailyEntry } from "@shared/schema";
