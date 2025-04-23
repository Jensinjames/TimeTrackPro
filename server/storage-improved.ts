// We need a complete fresh implementation with proper interfaces
import { 
  users, 
  categories, 
  subcategories, 
  dailyEntries, 
  timeRecords, 
  habitRecords, 
  defaultCategories 
} from "@shared/schema";
import type {
  User,
  InsertUser,
  Category,
  InsertCategory,
  Subcategory,
  InsertSubcategory,
  DailyEntry,
  InsertDailyEntry,
  TimeRecord,
  InsertTimeRecord,
  HabitRecord,
  InsertHabitRecord,
  CategoryWithSubcategories,
  DailyEntryWithDetails
} from "@shared/schema";
import { IStorage } from './storage';
import { db } from "./db";
import { eq, and, gte, lte } from "drizzle-orm";
import MemoryStore from "memorystore";
import session from "express-session";

/**
 * Improved storage implementation with better handling of:
 * - Monthly goals
 * - Unaccounted time tracking
 */
export class ImprovedDatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    // Setup memory session store
    const SessionStore = MemoryStore(session);
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }

  /**
   * Get dashboardData with unaccounted time calculation
   */
  async getDashboardData(userId: number, date: Date): Promise<any> {
    // Get daily entry and categories from parent methods
    const entry = await this.getDailyEntryByDate(userId, date);
    const categories = await this.getCategories(userId);
    
    // Track total minutes spent across all categories
    let totalMinutesSpent = 0;
    
    // Map categories and calculate actual time and progress
    const categoryData = categories.map(category => {
      let actualMinutes = 0;
      
      if (entry) {
        const categoryTimeRecords = entry.timeRecords.filter(
          record => record.subcategory.categoryId === category.id
        );
        
        actualMinutes = categoryTimeRecords.reduce(
          (sum, record) => sum + record.minutes,
          0
        );
        
        // Add to total minutes spent
        totalMinutesSpent += actualMinutes;
      }
      
      const actualHours = actualMinutes / 60;
      
      // Calculate the target hours based on goal period
      let targetGoalHours = category.goalHours;
      
      // If using monthly goal, convert to daily equivalent for progress calculation
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        targetGoalHours = category.monthlyGoalHours / 30;
      }
      
      // Calculate progress based on the correct goal
      const progress = targetGoalHours > 0 ? (actualHours / targetGoalHours) * 100 : 0;
      
      return {
        ...category,
        actualHours,
        progress: Math.min(progress, 100)
      };
    });
    
    // Calculate unaccounted minutes (total minutes in day minus allocated minutes)
    let unaccountedMinutes = entry?.unaccountedMinutes;
    
    // If no unaccounted minutes are stored and we have an entry, calculate it
    if ((unaccountedMinutes === undefined || unaccountedMinutes === null) && entry) {
      unaccountedMinutes = Math.max(0, 1440 - totalMinutesSpent); // 24 hours = 1440 minutes
      
      // If we have an entry without unaccounted minutes, update it
      try {
        await db.update(dailyEntries)
          .set({ unaccountedMinutes })
          .where(eq(dailyEntries.id, entry.id));
      } catch (error) {
        console.error("Failed to update entry with unaccounted minutes:", error);
      }
    }
    
    // Calculate metrics
    const dailyScore = entry?.dailyScore || 0;
    const motivationLevel = entry?.motivationLevel || 0;
    const sleepDuration = entry?.sleepHours || 0;
    const healthBalance = entry?.healthBalance || 0;
    
    return {
      dailyScore,
      motivationLevel,
      sleepDuration,
      healthBalance,
      unaccountedMinutes, // Include unaccounted minutes in dashboard data
      categories: categoryData
    };
  }

  /**
   * Setup default categories with monthly goals
   */
  async setupDefaultCategories(userId: number): Promise<void> {
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      
      // Insert category with both daily and monthly goals
      const [category] = await db.insert(categories).values({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        goalHours: cat.goalHours,
        monthlyGoalHours: cat.goalHours * 30, // Set default monthly goal
        goalPeriod: 'daily', // Default to daily goal period
        order: i
      }).returning();
      
      // Create subcategories for this category
      for (const sub of cat.subcategories) {
        await db.insert(subcategories).values({
          categoryId: category.id,
          name: sub.name,
          goalMinutes: sub.goalMinutes,
          goalType: sub.goalType
        });
      }
    }
  }
}