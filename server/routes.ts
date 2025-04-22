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
      if (timeRecords && Array.isArray(timeRecords) && entry) {
        for (const record of timeRecords) {
          if (record.minutes > 0) {
            await storage.updateTimeRecord(entry.id, record.subcategoryId, record.minutes);
          }
        }
      }
      
      // Process habit records
      if (habitRecords && Array.isArray(habitRecords) && entry) {
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
    
    // Support both single date and date range
    const dateParam = req.query.date as string;
    const fromParam = req.query.from as string;
    const toParam = req.query.to as string;
    const viewParam = req.query.view as string;
    
    // If date range is provided, use it
    if (fromParam && toParam) {
      try {
        const fromDate = new Date(fromParam);
        const toDate = new Date(toParam);
        
        // If requesting time allocation view, generate specialized data
        if (viewParam === 'time-allocation') {
          const categories = await storage.getCategories(req.user.id);
          const entries = await storage.getDailyEntriesInRange(req.user.id, fromDate, toDate);
          
          // Process entries to create time allocation data
          const timeAllocationData = await generateTimeAllocationData(categories, entries);
          res.json(timeAllocationData);
          return;
        }
        
        // Since our storage doesn't have a date range method yet,
        // we'll use the regular dashboard data for now
        // TODO: Implement actual date range aggregation
        const dashboardData = await storage.getDashboardData(req.user.id, toDate);
        res.json(dashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
      }
    } else {
      // Fall back to single date behavior
      const date = new Date(dateParam || new Date().toISOString());
      
      try {
        // If requesting time allocation view for a single day
        if (viewParam === 'time-allocation') {
          const categories = await storage.getCategories(req.user.id);
          const entry = await storage.getDailyEntryByDate(req.user.id, date);
          
          // Create a single-entry array for our generator function
          const entries = entry ? [entry] : [];
          const timeAllocationData = await generateTimeAllocationData(categories, entries);
          res.json(timeAllocationData);
          return;
        }
        
        // Standard dashboard data
        const dashboardData = await storage.getDashboardData(req.user.id, date);
        res.json(dashboardData);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: "Failed to fetch dashboard data" });
      }
    }
  });
  
  // Helper function to generate time allocation data for pie charts
  async function generateTimeAllocationData(categories: any[], entries: any[]) {
    // Calculate unaccounted time (1440 minutes per day - all time records)
    let totalMinutesSpent = 0;
    let totalDays = 0;
    
    // Initialize category data for reality and goals
    const categoryRealityMap = new Map();
    const categoryGoalsMap = new Map();
    
    // Set up initial data structure for all categories
    for (const category of categories) {
      const goalMinutes = category.goalHours * 60;
      
      categoryRealityMap.set(category.id, {
        name: category.name,
        value: 0,
        color: category.color,
        subcategories: []
      });
      
      categoryGoalsMap.set(category.id, {
        name: category.name,
        value: goalMinutes,
        color: category.color,
        subcategories: []
      });
      
      // Initialize subcategory data
      for (const subcategory of category.subcategories || []) {
        // Ensure subcategory goal is initialized for goals pie
        const subcategoryGoalData = {
          name: subcategory.name,
          value: subcategory.goalMinutes || 0,
          color: category.color // Use category color with slight variation if needed
        };
        
        const subGoals = categoryGoalsMap.get(category.id);
        if (subGoals && subGoals.subcategories) {
          subGoals.subcategories.push(subcategoryGoalData);
        }
      }
    }
    
    // Process all entries
    for (const entry of entries) {
      // Count the day
      totalDays++;
      
      // Process time records
      for (const record of entry.timeRecords || []) {
        const subcategory = record.subcategory;
        if (!subcategory) continue;
        
        const category = subcategory.category;
        if (!category) continue;
        
        const minutes = record.minutes || 0;
        totalMinutesSpent += minutes;
        
        // Add minutes to category total
        const categoryData = categoryRealityMap.get(category.id);
        if (categoryData) {
          categoryData.value += minutes;
          
          // Add or update subcategory data
          const existingSubIndex = categoryData.subcategories.findIndex(
            (sub: any) => sub.name === subcategory.name
          );
          
          if (existingSubIndex >= 0) {
            categoryData.subcategories[existingSubIndex].value += minutes;
          } else {
            categoryData.subcategories.push({
              name: subcategory.name,
              value: minutes,
              color: category.color // Use category color with slight variation if needed
            });
          }
        }
      }
    }
    
    // Calculate unaccounted minutes (assuming 24 hours per day)
    const totalPossibleMinutes = totalDays * 1440;
    const unaccountedMinutes = Math.max(0, totalPossibleMinutes - totalMinutesSpent);
    
    // Convert maps to arrays for the final format
    const realityData = Array.from(categoryRealityMap.values())
      .filter((category: any) => category.value > 0);
      
    const goalsData = Array.from(categoryGoalsMap.values())
      .filter((category: any) => category.value > 0);
    
    return {
      reality: realityData,
      goals: goalsData,
      unaccountedMinutes,
      totalDays
    };
  }
  
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
  // Enhanced implementation with weighted scoring based on goal completion
  if (!timeRecords?.length && !habitRecords?.length) return 0;
  
  // Time records contribution
  let timeScore = 0;
  let timeGoalTotal = 0;
  
  if (timeRecords?.length) {
    // Group records by subcategory to handle goal completion properly
    const recordsBySubcategory = new Map<number, { 
      minutes: number, 
      goalMinutes: number,
      category: string 
    }>();
    
    for (const record of timeRecords) {
      if (!record.subcategory) continue;
      
      const subcatId = record.subcategoryId;
      const minutes = record.minutes || 0;
      const goalMinutes = record.subcategory.goalMinutes || 60;
      const category = record.subcategory.category?.name?.toLowerCase() || '';
      
      recordsBySubcategory.set(subcatId, {
        minutes,
        goalMinutes,
        category
      });
      
      timeGoalTotal += goalMinutes;
    }
    
    // Calculate achievement levels relative to goals
    recordsBySubcategory.forEach((data) => {
      // Don't let overachievement in one category completely mask underachievement in others
      const completionRatio = Math.min(data.minutes / data.goalMinutes, 1.5);
      
      // Weight more important categories higher
      let categoryWeight = 1.0;
      if (data.category === 'faith' || data.category === 'work') {
        categoryWeight = 1.3; // 30% more weight for faith and work
      } else if (data.category === 'health') {
        categoryWeight = 1.2; // 20% more weight for health
      }
      
      timeScore += (completionRatio * data.goalMinutes * categoryWeight);
    });
  }
  
  // Habit records contribution
  let habitScore = 0;
  let habitTotal = 0;
  
  if (habitRecords?.length) {
    // Group records by subcategory and category for better weighting
    const habitsByCategory = new Map<string, { completed: number, total: number }>();
    
    for (const record of habitRecords) {
      if (!record.subcategory?.category) continue;
      
      const category = record.subcategory.category.name.toLowerCase();
      
      if (!habitsByCategory.has(category)) {
        habitsByCategory.set(category, { completed: 0, total: 0 });
      }
      
      const categoryData = habitsByCategory.get(category)!;
      categoryData.total += 1;
      
      if (record.completed) {
        categoryData.completed += 1;
      }
    }
    
    // Calculate weighted habit score
    habitsByCategory.forEach((data, category) => {
      let categoryWeight = 1.0;
      
      // Adjust weight based on category importance
      if (category === 'faith' || category === 'work') {
        categoryWeight = 1.3;
      } else if (category === 'health') {
        categoryWeight = 1.2;
      }
      
      const categoryCompletionRatio = data.completed / data.total;
      habitScore += (categoryCompletionRatio * data.total * categoryWeight);
      habitTotal += data.total;
    });
  }
  
  // Combine scores with diminishing returns for very high achievements
  // This prevents getting 100% too easily and makes it more challenging
  let finalScore = 0;
  
  if (timeGoalTotal > 0) {
    const timeContribution = Math.min((timeScore / timeGoalTotal) * 60, 60);
    finalScore += timeContribution;
  }
  
  if (habitTotal > 0) {
    const habitContribution = Math.min((habitScore / habitTotal) * 40, 40);
    finalScore += habitContribution;
  }
  
  // Apply a curve to make high scores harder to achieve
  // This uses a modified sigmoid function
  const curvedScore = Math.round(100 / (1 + Math.exp(-0.05 * (finalScore - 70))));
  
  return Math.min(Math.max(curvedScore, 0), 100);
}

function calculateMotivationLevel(timeRecords: any[], habitRecords: any[]): number {
  // More advanced motivation calculation with category weighting and momentum factors
  if (!timeRecords?.length && !habitRecords?.length) return 0;
  
  // Time records contribution
  let energyScore = 0;
  let energyTotal = 0;
  
  // Categories that contribute more positively to motivation/energy
  const energizingCategories = ['faith', 'health', 'hobbies'];
  // Categories that might drain energy if overperformed
  const drainingCategories = ['work'];
  
  if (timeRecords?.length) {
    // Track category totals
    const categoryTotals = new Map<string, { minutes: number, goal: number }>();
    
    for (const record of timeRecords) {
      if (!record.subcategory?.category) continue;
      
      const category = record.subcategory.category.name.toLowerCase();
      const minutes = record.minutes || 0;
      
      if (!categoryTotals.has(category)) {
        // Get category goal from subcategory's parent
        const goalHours = record.subcategory.category.goalHours || 1;
        categoryTotals.set(category, { minutes: 0, goal: goalHours * 60 });
      }
      
      const data = categoryTotals.get(category)!;
      data.minutes += minutes;
    }
    
    // Calculate energy score based on category balance
    categoryTotals.forEach((data, category) => {
      const completionRatio = data.minutes / data.goal;
      
      if (energizingCategories.includes(category)) {
        // Energizing activities provide motivation proportional to completion
        energyScore += Math.min(completionRatio, 1.2) * data.goal * 1.5;
      } else if (drainingCategories.includes(category)) {
        // Draining activities may reduce motivation if too much is done
        if (completionRatio > 1.2) {
          // Overwork penalty
          energyScore -= (completionRatio - 1.2) * data.goal * 0.3;
        } else {
          // Regular contribution
          energyScore += completionRatio * data.goal;
        }
      } else {
        // Neutral categories
        energyScore += completionRatio * data.goal;
      }
      
      energyTotal += data.goal;
    });
  }
  
  // Habit records contribution - focus on consistency
  let habitScore = 0;
  let habitTotal = 0;
  
  if (habitRecords?.length) {
    const habitsByCategory = new Map<string, { completed: number, total: number }>();
    
    for (const record of habitRecords) {
      if (!record.subcategory?.category) continue;
      
      const category = record.subcategory.category.name.toLowerCase();
      
      if (!habitsByCategory.has(category)) {
        habitsByCategory.set(category, { completed: 0, total: 0 });
      }
      
      const data = habitsByCategory.get(category)!;
      data.total += 1;
      
      if (record.completed) {
        data.completed += 1;
      }
    }
    
    // Calculate habit motivation contribution
    habitsByCategory.forEach((data, category) => {
      let multiplier = 1.0;
      
      if (energizingCategories.includes(category)) {
        multiplier = 1.5;
      }
      
      const completionRatio = data.completed / data.total;
      habitScore += completionRatio * data.total * multiplier;
      habitTotal += data.total;
    });
  }
  
  // Combine scores with emphasis on energizing activities
  let motivationScore = 0;
  
  if (energyTotal > 0) {
    motivationScore += (energyScore / energyTotal) * 70;
  }
  
  if (habitTotal > 0) {
    motivationScore += (habitScore / habitTotal) * 30;
  }
  
  // Apply a progressive curve for motivation
  const adjustedScore = Math.round(100 / (1 + Math.exp(-0.06 * (motivationScore - 60))));
  
  return Math.min(Math.max(adjustedScore, 0), 100);
}

function calculateHealthBalance(timeRecords: any[], habitRecords: any[]): number {
  // Focus on health-related activities and habits with a more nuanced approach
  if (!timeRecords?.length && !habitRecords?.length) return 0;
  
  // Define health-related categories and subcategories
  const healthCategories = ['health'];
  const healthSubcategories = ['exercise', 'sleep', 'meditation', 'workout'];
  
  // Time records contribution
  let healthTimeScore = 0;
  let healthTimeTotal = 0;
  
  if (timeRecords?.length) {
    for (const record of timeRecords) {
      if (!record.subcategory) continue;
      
      const category = record.subcategory.category?.name?.toLowerCase() || '';
      const subcategory = record.subcategory.name.toLowerCase();
      
      // Check if this is a health-related activity
      if (healthCategories.includes(category) || healthSubcategories.includes(subcategory)) {
        const minutes = record.minutes || 0;
        const goalMinutes = record.subcategory.goalMinutes || 60;
        
        // Weight sleep more heavily in health balance
        let multiplier = 1.0;
        if (subcategory === 'sleep') {
          multiplier = 1.5;
        } else if (subcategory === 'exercise' || subcategory === 'workout') {
          multiplier = 1.3;
        }
        
        // Calculate contribution based on completion ratio with weighted goal
        const completionRatio = Math.min(minutes / goalMinutes, 1.2);
        healthTimeScore += completionRatio * goalMinutes * multiplier;
        healthTimeTotal += goalMinutes * multiplier;
      }
    }
  }
  
  // Habit records contribution
  let healthHabitScore = 0;
  let healthHabitTotal = 0;
  
  if (habitRecords?.length) {
    for (const record of habitRecords) {
      if (!record.subcategory) continue;
      
      const category = record.subcategory.category?.name?.toLowerCase() || '';
      const subcategory = record.subcategory.name.toLowerCase();
      
      if (healthCategories.includes(category) || healthSubcategories.includes(subcategory)) {
        healthHabitTotal += 1;
        
        if (record.completed) {
          let multiplier = 1.0;
          // Weight certain habits more heavily
          if (subcategory.includes('workout') || subcategory.includes('wake')) {
            multiplier = 1.5;
          }
          
          healthHabitScore += 1 * multiplier;
        }
      }
    }
  }
  
  // Calculate final health balance
  let healthBalance = 0;
  
  // Time-based activities contribute 70%
  if (healthTimeTotal > 0) {
    healthBalance += (healthTimeScore / healthTimeTotal) * 70;
  }
  
  // Habits contribute 30%
  if (healthHabitTotal > 0) {
    healthBalance += (healthHabitScore / healthHabitTotal) * 30;
  }
  
  // If no health-specific activities were tracked, return 0
  if (healthTimeTotal === 0 && healthHabitTotal === 0) {
    return 0;
  }
  
  // Apply a progressive curve that rewards consistency
  return Math.min(Math.round(healthBalance), 100);
}

import { DailyEntry } from "@shared/schema";
