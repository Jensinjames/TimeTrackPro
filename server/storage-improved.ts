import { users, categories, subcategories, dailyEntries, timeRecords, habitRecords, defaultCategories } from "@shared/schema";
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
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db, pool } from "./db";
import { eq, and, desc, between, gte, lte } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

export class ImprovedDatabaseStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // Dashboard data method with improved goal calculation
  async getDashboardData(userId: number, date: Date): Promise<any> {
    const entry = await this.getDailyEntryByDate(userId, date);
    const categories = await this.getCategories(userId);
    
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
      }
      
      const actualHours = actualMinutes / 60;
      
      // Calculate the target hours based on goal period
      let targetGoalHours = category.goalHours;
      
      // If using monthly goal, convert to daily equivalent for progress calculation
      if (category.goalPeriod === 'monthly') {
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
      categories: categoryData
    };
  }

  // This method gets a daily entry with details including time and habit records
  async getDailyEntryByDate(userId: number, date: Date): Promise<DailyEntryWithDetails | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Get the daily entry
    const [entry] = await db
      .select()
      .from(dailyEntries)
      .where(
        and(
          eq(dailyEntries.userId, userId),
          gte(dailyEntries.date, startOfDay),
          lte(dailyEntries.date, endOfDay)
        )
      );
    
    if (!entry) return undefined;
    
    // Get time records with subcategory and category details
    const entryTimeRecords = await db
      .select({
        id: timeRecords.id,
        entryId: timeRecords.entryId,
        subcategoryId: timeRecords.subcategoryId,
        minutes: timeRecords.minutes,
        subcategory: {
          id: subcategories.id,
          categoryId: subcategories.categoryId,
          name: subcategories.name,
          goalMinutes: subcategories.goalMinutes,
          goalType: subcategories.goalType,
          category: {
            id: categories.id,
            userId: categories.userId,
            name: categories.name,
            color: categories.color,
            icon: categories.icon,
            goalHours: categories.goalHours,
            monthlyGoalHours: categories.monthlyGoalHours,
            goalPeriod: categories.goalPeriod,
            order: categories.order
          }
        }
      })
      .from(timeRecords)
      .leftJoin(subcategories, eq(timeRecords.subcategoryId, subcategories.id))
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(timeRecords.entryId, entry.id));
    
    // Get habit records with subcategory and category details
    const entryHabitRecords = await db
      .select({
        id: habitRecords.id,
        entryId: habitRecords.entryId,
        subcategoryId: habitRecords.subcategoryId,
        completed: habitRecords.completed,
        subcategory: {
          id: subcategories.id,
          categoryId: subcategories.categoryId,
          name: subcategories.name,
          goalMinutes: subcategories.goalMinutes,
          goalType: subcategories.goalType,
          category: {
            id: categories.id,
            userId: categories.userId,
            name: categories.name,
            color: categories.color,
            icon: categories.icon,
            goalHours: categories.goalHours,
            monthlyGoalHours: categories.monthlyGoalHours,
            goalPeriod: categories.goalPeriod,
            order: categories.order
          }
        }
      })
      .from(habitRecords)
      .leftJoin(subcategories, eq(habitRecords.subcategoryId, subcategories.id))
      .leftJoin(categories, eq(subcategories.categoryId, categories.id))
      .where(eq(habitRecords.entryId, entry.id));
    
    // Combine data
    return {
      ...entry,
      timeRecords: entryTimeRecords,
      habitRecords: entryHabitRecords
    };
  }

  // Get all categories with subcategories for a user
  async getCategories(userId: number): Promise<CategoryWithSubcategories[]> {
    const userCategories = await db.select().from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.order);

    const result: CategoryWithSubcategories[] = [];
    
    for (const category of userCategories) {
      const subcatList = await db
        .select()
        .from(subcategories)
        .where(eq(subcategories.categoryId, category.id));
      
      result.push({
        ...category,
        subcategories: subcatList
      });
    }
    
    return result;
  }

  // Setup default categories with both monthly and daily goals
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