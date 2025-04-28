/**
 * Reports API module
 * Handles generating and exporting reports for visualizations and analytics
 */

import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import { logger } from '../../lib/logger';
import { parseISO, startOfDay, endOfDay, isValid, subDays, subWeeks, subMonths, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isAfter, isBefore, isEqual } from 'date-fns';
import { z } from 'zod';

// Create router for all report-related routes
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

/**
 * Get dashboard data for visualization
 * This is a key API that aggregates data for the main dashboard
 */
router.get('/dashboard', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse date from query parameters
    const dateStr = req.query.date as string;
    const fromStr = req.query.from as string;
    const toStr = req.query.to as string;
    
    let date: Date;
    let isRange = false;
    
    // Determine if it's a single date or range query
    if (fromStr && toStr) {
      const fromDate = parseDate(fromStr);
      const toDate = parseDate(toStr);
      
      if (!fromDate || !toDate) {
        return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
      }
      
      // Set the date to today for the range query
      date = new Date();
      isRange = true;
    } else {
      const parsedDate = dateStr ? parseDate(dateStr) : new Date();
      if (!parsedDate) {
        return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
      }
      date = parsedDate;
    }
    
    // Call the appropriate method based on the query type
    const dashboardData = isRange
      ? await storage.getDashboardData(userId, date) // TODO: Implement range-based dashboard data
      : await storage.getDashboardData(userId, date);
    
    res.json(dashboardData);
  } catch (error: any) {
    logger.error('Failed to get dashboard data', 'reports:dashboard', 
      { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get dashboard data' });
  }
});

/**
 * Generate weekly summary report
 * Aggregates data for the weekly view
 */
router.get('/weekly-summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse date or default to current week
    const dateStr = req.query.date as string;
    const date = dateStr ? parseDate(dateStr) : new Date();
    
    if (!date) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    // Calculate start and end of week
    const start = startOfWeek(date, { weekStartsOn: 0 }); // Sunday
    const end = endOfWeek(date, { weekStartsOn: 0 }); // Saturday
    
    // Get daily entries for the week
    const entries = await storage.getDailyEntriesInRange(userId, start, end);
    
    // Get all categories with subcategories
    const categories = await storage.getCategories(userId);
    
    // Calculate weekly metrics
    const weeklyData = calculateWeeklySummary(entries, categories);
    
    res.json({
      periodStart: format(start, 'yyyy-MM-dd'),
      periodEnd: format(end, 'yyyy-MM-dd'),
      ...weeklyData,
    });
  } catch (error: any) {
    logger.error('Failed to generate weekly summary', 'reports:weeklySummary', 
      { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to generate weekly summary' });
  }
});

/**
 * Generate monthly summary report
 * Aggregates data for the monthly view
 */
router.get('/monthly-summary', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse date or default to current month
    const dateStr = req.query.date as string;
    const date = dateStr ? parseDate(dateStr) : new Date();
    
    if (!date) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    // Calculate start and end of month
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    
    // Get daily entries for the month
    const entries = await storage.getDailyEntriesInRange(userId, start, end);
    
    // Get all categories with subcategories
    const categories = await storage.getCategories(userId);
    
    // Calculate monthly metrics
    const monthlyData = calculateMonthlySummary(entries, categories);
    
    res.json({
      periodStart: format(start, 'yyyy-MM-dd'),
      periodEnd: format(end, 'yyyy-MM-dd'),
      ...monthlyData,
    });
  } catch (error: any) {
    logger.error('Failed to generate monthly summary', 'reports:monthlySummary', 
      { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to generate monthly summary' });
  }
});

/**
 * Get time allocation by category
 * Shows how time was allocated across categories for a specified period
 */
router.get('/time-allocation', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse date range or use defaults
    const fromStr = req.query.from as string;
    const toStr = req.query.to as string;
    
    const from = fromStr ? parseDate(fromStr) : subDays(new Date(), 30);
    const to = toStr ? parseDate(toStr) : new Date();
    
    if (!from || !to) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    // Get daily entries for the range
    const entries = await storage.getDailyEntriesInRange(userId, from, to);
    
    // Get all categories with subcategories
    const categories = await storage.getCategories(userId);
    
    // Calculate time allocation data
    const timeAllocationData = calculateTimeAllocation(entries, categories);
    
    res.json({
      periodStart: format(from, 'yyyy-MM-dd'),
      periodEnd: format(to, 'yyyy-MM-dd'),
      ...timeAllocationData,
    });
  } catch (error: any) {
    logger.error('Failed to get time allocation data', 'reports:timeAllocation', 
      { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get time allocation data' });
  }
});

/**
 * Get goal progress report
 * Shows progress toward goals for a specified period
 */
router.get('/goal-progress', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User not found' });
    
    // Parse parameters
    const periodType = (req.query.periodType as string) || 'month';
    const dateStr = req.query.date as string;
    const date = dateStr ? parseDate(dateStr) : new Date();
    
    if (!date) {
      return res.status(400).json({ error: 'Invalid date format. Use ISO format (YYYY-MM-DD).' });
    }
    
    let start: Date;
    let end: Date;
    
    // Calculate date range based on period type
    if (periodType === 'week') {
      start = startOfWeek(date, { weekStartsOn: 0 });
      end = endOfWeek(date, { weekStartsOn: 0 });
    } else if (periodType === 'month') {
      start = startOfMonth(date);
      end = endOfMonth(date);
    } else {
      return res.status(400).json({ error: 'Invalid period type. Use "week" or "month".' });
    }
    
    // Get daily entries for the range
    const entries = await storage.getDailyEntriesInRange(userId, start, end);
    
    // Get all categories with subcategories
    const categories = await storage.getCategories(userId);
    
    // Calculate goal progress data
    const goalProgressData = calculateGoalProgress(entries, categories, periodType);
    
    res.json({
      periodType,
      periodStart: format(start, 'yyyy-MM-dd'),
      periodEnd: format(end, 'yyyy-MM-dd'),
      ...goalProgressData,
    });
  } catch (error: any) {
    logger.error('Failed to get goal progress data', 'reports:goalProgress', 
      { query: req.query }, req.user?.id, req.path, error);
    res.status(500).json({ error: 'Failed to get goal progress data' });
  }
});

// ----- Helper functions for report generation -----

/**
 * Calculate weekly summary metrics
 */
function calculateWeeklySummary(entries: any[], categories: any[]) {
  // Default structure for the weekly summary
  const summary = {
    totalTrackedMinutes: 0,
    dailyAverageMinutes: 0,
    averageDailyScore: 0,
    averageMotivationLevel: 0,
    averageSleepHours: 0,
    categories: [] as any[],
    byDay: [] as any[],
  };
  
  if (entries.length === 0) {
    return summary;
  }
  
  // Calculate overall metrics
  let totalTrackedMinutes = 0;
  let totalDailyScore = 0;
  let totalMotivationLevel = 0;
  let totalSleepHours = 0;
  
  // Prepare category data structure
  const categoryMap = new Map();
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      totalMinutes: 0,
      goalHours: category.goalHours,
      progress: 0,
      subcategories: category.subcategories.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        totalMinutes: 0,
        goalMinutes: sub.goalMinutes,
        progress: 0,
      })),
    });
  });
  
  // Process each entry
  entries.forEach(entry => {
    // Add to total metrics
    totalDailyScore += entry.dailyScore || 0;
    totalMotivationLevel += entry.motivationLevel || 0;
    totalSleepHours += entry.sleepHours || 0;
    
    // Process time records
    entry.timeRecords?.forEach((record: any) => {
      totalTrackedMinutes += record.minutes || 0;
      
      // Find corresponding category and subcategory
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category && subcategory) {
        const categoryData = categoryMap.get(category.id);
        if (categoryData) {
          categoryData.totalMinutes += record.minutes || 0;
          
          // Update subcategory data
          const subcategoryData = categoryData.subcategories.find((sub: any) => sub.id === subcategory.id);
          if (subcategoryData) {
            subcategoryData.totalMinutes += record.minutes || 0;
          }
        }
      }
    });
  });
  
  // Calculate averages
  const entryCount = entries.length;
  summary.totalTrackedMinutes = totalTrackedMinutes;
  summary.dailyAverageMinutes = entryCount > 0 ? Math.round(totalTrackedMinutes / entryCount) : 0;
  summary.averageDailyScore = entryCount > 0 ? totalDailyScore / entryCount : 0;
  summary.averageMotivationLevel = entryCount > 0 ? totalMotivationLevel / entryCount : 0;
  summary.averageSleepHours = entryCount > 0 ? totalSleepHours / entryCount : 0;
  
  // Calculate progress percentages for categories and subcategories
  categoryMap.forEach(categoryData => {
    // For weekly goal, divide goal hours by 7 to get daily goal, then multiply by entries.length
    const weeklyGoalMinutes = categoryData.goalHours * 60 * entries.length / 7;
    categoryData.progress = weeklyGoalMinutes > 0 
      ? Math.min(100, Math.round((categoryData.totalMinutes / weeklyGoalMinutes) * 100)) 
      : 0;
    
    // Calculate subcategory progress
    categoryData.subcategories.forEach((subcategory: any) => {
      const weeklySubGoalMinutes = subcategory.goalMinutes * entries.length / 7;
      subcategory.progress = weeklySubGoalMinutes > 0
        ? Math.min(100, Math.round((subcategory.totalMinutes / weeklySubGoalMinutes) * 100))
        : 0;
    });
  });
  
  // Format data for response
  summary.categories = Array.from(categoryMap.values());
  
  // Group entries by day
  const dayMap = new Map();
  entries.forEach(entry => {
    const day = format(new Date(entry.date), 'yyyy-MM-dd');
    dayMap.set(day, {
      date: day,
      dailyScore: entry.dailyScore || 0,
      motivationLevel: entry.motivationLevel || 0,
      sleepHours: entry.sleepHours || 0,
      totalMinutes: entry.timeRecords?.reduce((sum: number, record: any) => sum + (record.minutes || 0), 0) || 0,
    });
  });
  
  summary.byDay = Array.from(dayMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return summary;
}

/**
 * Calculate monthly summary metrics
 */
function calculateMonthlySummary(entries: any[], categories: any[]) {
  // Similar to weekly summary but with monthly goal calculation
  const summary = {
    totalTrackedMinutes: 0,
    dailyAverageMinutes: 0,
    averageDailyScore: 0,
    averageMotivationLevel: 0,
    averageSleepHours: 0,
    categories: [] as any[],
    byWeek: [] as any[],
  };
  
  if (entries.length === 0) {
    return summary;
  }
  
  // Calculate overall metrics
  let totalTrackedMinutes = 0;
  let totalDailyScore = 0;
  let totalMotivationLevel = 0;
  let totalSleepHours = 0;
  
  // Prepare category data structure
  const categoryMap = new Map();
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      totalMinutes: 0,
      monthlyGoalHours: category.monthlyGoalHours || (category.goalHours * 30),
      progress: 0,
      subcategories: category.subcategories.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        totalMinutes: 0,
        goalMinutes: sub.goalMinutes,
        progress: 0,
      })),
    });
  });
  
  // Process each entry
  entries.forEach(entry => {
    // Add to total metrics
    totalDailyScore += entry.dailyScore || 0;
    totalMotivationLevel += entry.motivationLevel || 0;
    totalSleepHours += entry.sleepHours || 0;
    
    // Process time records
    entry.timeRecords?.forEach((record: any) => {
      totalTrackedMinutes += record.minutes || 0;
      
      // Find corresponding category and subcategory
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category && subcategory) {
        const categoryData = categoryMap.get(category.id);
        if (categoryData) {
          categoryData.totalMinutes += record.minutes || 0;
          
          // Update subcategory data
          const subcategoryData = categoryData.subcategories.find((sub: any) => sub.id === subcategory.id);
          if (subcategoryData) {
            subcategoryData.totalMinutes += record.minutes || 0;
          }
        }
      }
    });
  });
  
  // Calculate averages
  const entryCount = entries.length;
  summary.totalTrackedMinutes = totalTrackedMinutes;
  summary.dailyAverageMinutes = entryCount > 0 ? Math.round(totalTrackedMinutes / entryCount) : 0;
  summary.averageDailyScore = entryCount > 0 ? totalDailyScore / entryCount : 0;
  summary.averageMotivationLevel = entryCount > 0 ? totalMotivationLevel / entryCount : 0;
  summary.averageSleepHours = entryCount > 0 ? totalSleepHours / entryCount : 0;
  
  // Calculate progress percentages for categories and subcategories
  categoryMap.forEach(categoryData => {
    // Use monthly goal in minutes
    const monthlyGoalMinutes = categoryData.monthlyGoalHours * 60;
    categoryData.progress = monthlyGoalMinutes > 0 
      ? Math.min(100, Math.round((categoryData.totalMinutes / monthlyGoalMinutes) * 100)) 
      : 0;
    
    // For subcategories, use a monthly estimate
    categoryData.subcategories.forEach((subcategory: any) => {
      const monthlySubGoalMinutes = subcategory.goalMinutes * 30;
      subcategory.progress = monthlySubGoalMinutes > 0
        ? Math.min(100, Math.round((subcategory.totalMinutes / monthlySubGoalMinutes) * 100))
        : 0;
    });
  });
  
  // Format data for response
  summary.categories = Array.from(categoryMap.values());
  
  // Group entries by week
  const weekMap = new Map();
  entries.forEach(entry => {
    const entryDate = new Date(entry.date);
    const weekStart = format(startOfWeek(entryDate, { weekStartsOn: 0 }), 'yyyy-MM-dd');
    
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, {
        weekStart,
        weekEnd: format(endOfWeek(entryDate, { weekStartsOn: 0 }), 'yyyy-MM-dd'),
        totalMinutes: 0,
        dailyScores: 0,
        entryCount: 0,
      });
    }
    
    const weekData = weekMap.get(weekStart);
    weekData.totalMinutes += entry.timeRecords?.reduce((sum: number, record: any) => 
      sum + (record.minutes || 0), 0) || 0;
    weekData.dailyScores += entry.dailyScore || 0;
    weekData.entryCount += 1;
  });
  
  // Calculate averages for each week
  weekMap.forEach(week => {
    if (week.entryCount > 0) {
      week.averageDailyScore = week.dailyScores / week.entryCount;
    }
  });
  
  summary.byWeek = Array.from(weekMap.values()).sort((a, b) => 
    new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
  );
  
  return summary;
}

/**
 * Calculate time allocation across categories and subcategories
 */
function calculateTimeAllocation(entries: any[], categories: any[]) {
  const timeAllocation = {
    totalMinutes: 0,
    categories: [] as any[],
    byDay: [] as any[],
  };
  
  if (entries.length === 0) {
    return timeAllocation;
  }
  
  // Calculate total minutes tracked
  let totalMinutes = 0;
  
  // Prepare category data structure
  const categoryMap = new Map();
  categories.forEach(category => {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      totalMinutes: 0,
      percentage: 0,
      subcategories: category.subcategories.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        totalMinutes: 0,
        percentage: 0,
      })),
    });
  });
  
  // Process each entry
  entries.forEach(entry => {
    // Process time records
    entry.timeRecords?.forEach((record: any) => {
      totalMinutes += record.minutes || 0;
      
      // Find corresponding category and subcategory
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category && subcategory) {
        const categoryData = categoryMap.get(category.id);
        if (categoryData) {
          categoryData.totalMinutes += record.minutes || 0;
          
          // Update subcategory data
          const subcategoryData = categoryData.subcategories.find((sub: any) => sub.id === subcategory.id);
          if (subcategoryData) {
            subcategoryData.totalMinutes += record.minutes || 0;
          }
        }
      }
    });
  });
  
  // Calculate percentages
  categoryMap.forEach(categoryData => {
    categoryData.percentage = totalMinutes > 0 
      ? Math.round((categoryData.totalMinutes / totalMinutes) * 100) 
      : 0;
    
    // Calculate subcategory percentages (of total, not just category)
    categoryData.subcategories.forEach((subcategory: any) => {
      subcategory.percentage = totalMinutes > 0
        ? Math.round((subcategory.totalMinutes / totalMinutes) * 100)
        : 0;
    });
    
    // Sort subcategories by minutes (descending)
    categoryData.subcategories.sort((a: any, b: any) => b.totalMinutes - a.totalMinutes);
  });
  
  // Format and sort categories by minutes (descending)
  const sortedCategories = Array.from(categoryMap.values())
    .sort((a, b) => b.totalMinutes - a.totalMinutes);
  
  timeAllocation.totalMinutes = totalMinutes;
  timeAllocation.categories = sortedCategories;
  
  // Group by day for time series data
  const dayMap = new Map();
  entries.forEach(entry => {
    const day = format(new Date(entry.date), 'yyyy-MM-dd');
    
    if (!dayMap.has(day)) {
      // Initialize day data with 0 minutes for each category
      const categoryData = {} as Record<number, number>;
      categories.forEach(category => {
        categoryData[category.id] = 0;
      });
      
      dayMap.set(day, {
        date: day,
        totalMinutes: 0,
        categories: categoryData,
      });
    }
    
    const dayData = dayMap.get(day);
    
    // Sum minutes by category for this entry
    entry.timeRecords?.forEach((record: any) => {
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category) {
        dayData.totalMinutes += record.minutes || 0;
        dayData.categories[category.id] += record.minutes || 0;
      }
    });
  });
  
  timeAllocation.byDay = Array.from(dayMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  return timeAllocation;
}

/**
 * Calculate goal progress for categories and subcategories
 */
function calculateGoalProgress(entries: any[], categories: any[], periodType: string) {
  const goalProgress = {
    categories: [] as any[],
  };
  
  if (entries.length === 0 || categories.length === 0) {
    return goalProgress;
  }
  
  // Prepare category data structure
  const categoryMap = new Map();
  categories.forEach(category => {
    // Determine which goal to use (daily or monthly)
    const useMonthlyGoal = category.goalPeriod === 'monthly' || periodType === 'month';
    
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      color: category.color,
      icon: category.icon,
      goalPeriod: category.goalPeriod || 'daily',
      totalMinutes: 0,
      goalMinutes: useMonthlyGoal 
        ? (category.monthlyGoalHours || category.goalHours * 30) * 60 // Monthly goal in minutes
        : category.goalHours * 60 * (periodType === 'week' ? 7 : 1), // Weekly or daily goal in minutes
      progress: 0,
      subcategories: category.subcategories.map((sub: any) => ({
        id: sub.id,
        name: sub.name,
        totalMinutes: 0,
        goalMinutes: sub.goalMinutes * (
          periodType === 'month' ? 30 : (periodType === 'week' ? 7 : 1)
        ),
        progress: 0,
      })),
    });
  });
  
  // Process each entry
  entries.forEach(entry => {
    // Process time records
    entry.timeRecords?.forEach((record: any) => {
      // Find corresponding category and subcategory
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category && subcategory) {
        const categoryData = categoryMap.get(category.id);
        if (categoryData) {
          categoryData.totalMinutes += record.minutes || 0;
          
          // Update subcategory data
          const subcategoryData = categoryData.subcategories.find((sub: any) => sub.id === subcategory.id);
          if (subcategoryData) {
            subcategoryData.totalMinutes += record.minutes || 0;
          }
        }
      }
    });
    
    // Process habit records
    entry.habitRecords?.forEach((record: any) => {
      // Find corresponding subcategory
      const subcategory = record.subcategory;
      const category = subcategory?.category;
      
      if (category && subcategory && record.completed && 
          (subcategory.goalType === 'habit' || subcategory.goalType === 'binary')) {
        const categoryData = categoryMap.get(category.id);
        if (categoryData) {
          // Update subcategory data for habits (add a "completion point")
          const subcategoryData = categoryData.subcategories.find((sub: any) => sub.id === subcategory.id);
          if (subcategoryData) {
            subcategoryData.completedCount = (subcategoryData.completedCount || 0) + 1;
          }
        }
      }
    });
  });
  
  // Calculate progress percentages
  categoryMap.forEach(categoryData => {
    // Calculate category progress
    categoryData.progress = categoryData.goalMinutes > 0 
      ? Math.min(100, Math.round((categoryData.totalMinutes / categoryData.goalMinutes) * 100)) 
      : 0;
    
    // Calculate subcategory progress
    categoryData.subcategories.forEach((subcategory: any) => {
      if (subcategory.goalMinutes > 0) {
        subcategory.progress = Math.min(100, 
          Math.round((subcategory.totalMinutes / subcategory.goalMinutes) * 100));
      } else if (subcategory.completedCount !== undefined) {
        // For habits, progress is based on completion count vs. expected count
        const expectedCount = periodType === 'month' ? 30 : (periodType === 'week' ? 7 : 1);
        subcategory.progress = Math.min(100, 
          Math.round((subcategory.completedCount / expectedCount) * 100));
      }
    });
    
    // Sort subcategories by progress (descending)
    categoryData.subcategories.sort((a: any, b: any) => b.progress - a.progress);
  });
  
  // Format data for response
  goalProgress.categories = Array.from(categoryMap.values());
  
  return goalProgress;
}

export default router;