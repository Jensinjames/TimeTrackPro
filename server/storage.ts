// Database storage implementation with schema type safety
import memoryStore from "memorystore";
import session from "express-session";
import { db } from "./db";
import {
  users,
  categories,
  subcategories,
  dailyEntries,
  timeRecords,
  habitRecords,
  defaultCategories,
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
} from "../shared/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

// Storage interface to abstract persistence layer
export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;

  // Category methods
  getCategories(userId: number): Promise<CategoryWithSubcategories[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: number): Promise<void>;

  // Subcategory methods
  getSubcategory(id: number): Promise<Subcategory | undefined>;
  getSubcategories(categoryId: number): Promise<Subcategory[]>;
  createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory>;
  updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined>;
  deleteSubcategory(id: number): Promise<void>;

  // Daily entry methods
  getDailyEntry(id: number): Promise<DailyEntry | undefined>;
  getDailyEntryByDate(userId: number, date: Date): Promise<DailyEntryWithDetails | undefined>;
  createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry>;
  updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined>;

  // Time record methods
  createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord>;
  updateTimeRecord(entryId: number, subcategoryId: number, minutes: number): Promise<TimeRecord | undefined>;
  
  // Habit record methods
  createHabitRecord(record: InsertHabitRecord): Promise<HabitRecord>;
  updateHabitRecord(entryId: number, subcategoryId: number, completed: boolean): Promise<HabitRecord | undefined>;

  // Setup default categories for new user
  setupDefaultCategories(userId: number): Promise<void>;

  // Dashboard data methods
  getDashboardData(userId: number, date: Date): Promise<any>;
  
  // History data methods
  getDailyEntriesInRange(userId: number, startDate: Date, endDate: Date): Promise<any[]>;

  // Session store
  sessionStore: any;
}

// In-memory storage implementation for development/testing
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private subcategories: Map<number, Subcategory>;
  private dailyEntries: Map<number, DailyEntry>;
  private timeRecords: Map<number, TimeRecord>;
  private habitRecords: Map<number, HabitRecord>;
  
  // ID counters
  currentUserId: number;
  currentCategoryId: number;
  currentSubcategoryId: number;
  currentEntryId: number;
  currentTimeRecordId: number;
  currentHabitRecordId: number;
  sessionStore: any;
  
  constructor() {
    this.users = new Map();
    this.categories = new Map();
    this.subcategories = new Map();
    this.dailyEntries = new Map();
    this.timeRecords = new Map();
    this.habitRecords = new Map();
    
    // Initialize counters
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentSubcategoryId = 1;
    this.currentEntryId = 1;
    this.currentTimeRecordId = 1;
    this.currentHabitRecordId = 1;
    
    // Setup session store
    const SessionStore = memoryStore(session);
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    
    // Create default categories for the new user
    await this.setupDefaultCategories(id);
    
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Category methods
  async getCategories(userId: number): Promise<CategoryWithSubcategories[]> {
    const userCategories: Category[] = [];
    
    for (const category of this.categories.values()) {
      if (category.userId === userId) {
        userCategories.push(category);
      }
    }
    
    // Sort by order field
    userCategories.sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // Add subcategories to each category
    const result: CategoryWithSubcategories[] = [];
    
    for (const category of userCategories) {
      const categorySubcategories: Subcategory[] = [];
      
      for (const subcategory of this.subcategories.values()) {
        if (subcategory.categoryId === category.id) {
          categorySubcategories.push(subcategory);
        }
      }
      
      // Sort subcategories by priority
      categorySubcategories.sort((a, b) => {
        const priorityA = a.priority !== null ? a.priority : 999;
        const priorityB = b.priority !== null ? b.priority : 999;
        return priorityA - priorityB;
      });
      
      result.push({
        ...category,
        subcategories: categorySubcategories
      });
    }
    
    return result;
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    return this.categories.get(id);
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = this.currentCategoryId++;
    const newCategory: Category = { ...category, id };
    this.categories.set(id, newCategory);
    return newCategory;
  }
  
  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const existingCategory = this.categories.get(id);
    if (!existingCategory) {
      return undefined;
    }
    
    const updatedCategory: Category = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }
  
  async deleteCategory(id: number): Promise<void> {
    // Delete the category
    this.categories.delete(id);
    
    // Delete all subcategories
    for (const [subId, subcategory] of this.subcategories.entries()) {
      if (subcategory.categoryId === id) {
        this.subcategories.delete(subId);
      }
    }
  }
  
  // Subcategory methods
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    return this.subcategories.get(id);
  }
  
  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    const result: Subcategory[] = [];
    
    for (const subcategory of this.subcategories.values()) {
      if (subcategory.categoryId === categoryId) {
        result.push(subcategory);
      }
    }
    
    return result;
  }
  
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const id = this.currentSubcategoryId++;
    const newSubcategory: Subcategory = { ...subcategory, id };
    this.subcategories.set(id, newSubcategory);
    return newSubcategory;
  }
  
  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined> {
    const existingSubcategory = this.subcategories.get(id);
    if (!existingSubcategory) {
      return undefined;
    }
    
    const updatedSubcategory: Subcategory = { ...existingSubcategory, ...subcategory };
    this.subcategories.set(id, updatedSubcategory);
    return updatedSubcategory;
  }
  
  async deleteSubcategory(id: number): Promise<void> {
    this.subcategories.delete(id);
  }
  
  // Daily entry methods
  async getDailyEntry(id: number): Promise<DailyEntry | undefined> {
    return this.dailyEntries.get(id);
  }
  
  async getDailyEntryByDate(userId: number, date: Date): Promise<DailyEntryWithDetails | undefined> {
    // Get all entries
    const entries: DailyEntry[] = [];
    for (const entry of this.dailyEntries.values()) {
      if (entry.userId === userId) {
        entries.push(entry);
      }
    }
    
    // Find entry for the specified date (comparing dates without time)
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    let matchingEntry: DailyEntry | undefined;
    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      
      if (entryDate.getTime() === targetDate.getTime()) {
        matchingEntry = entry;
        break;
      }
    }
    
    if (!matchingEntry) {
      return undefined;
    }
    
    // Get time records for this entry
    const entryTimeRecords: TimeRecord[] = [];
    for (const record of this.timeRecords.values()) {
      if (record.entryId === matchingEntry.id) {
        entryTimeRecords.push(record);
      }
    }
    
    // Get habit records for this entry
    const entryHabitRecords: HabitRecord[] = [];
    for (const record of this.habitRecords.values()) {
      if (record.entryId === matchingEntry.id) {
        entryHabitRecords.push(record);
      }
    }
    
    // Enhance time records with subcategory and category information
    const enhancedTimeRecords = entryTimeRecords.map(record => {
      const subcategory = this.subcategories.get(record.subcategoryId);
      if (!subcategory) {
        return {
          ...record,
          subcategory: { id: 0, name: 'Unknown', categoryId: 0, goalMinutes: 0, goalType: 'time', displayId: null, priority: null, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
        };
      }
      
      const category = this.categories.get(subcategory.categoryId);
      if (!category) {
        return {
          ...record,
          subcategory: { ...subcategory, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
        };
      }
      
      return {
        ...record,
        subcategory: { ...subcategory, category }
      };
    });
    
    // Enhance habit records with subcategory and category information
    const enhancedHabitRecords = entryHabitRecords.map(record => {
      const subcategory = this.subcategories.get(record.subcategoryId);
      if (!subcategory) {
        return {
          ...record,
          subcategory: { id: 0, name: 'Unknown', categoryId: 0, goalMinutes: 0, goalType: 'binary', displayId: null, priority: null, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
        };
      }
      
      const category = this.categories.get(subcategory.categoryId);
      if (!category) {
        return {
          ...record,
          subcategory: { ...subcategory, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
        };
      }
      
      return {
        ...record,
        subcategory: { ...subcategory, category }
      };
    });
    
    return {
      ...matchingEntry,
      timeRecords: enhancedTimeRecords,
      habitRecords: enhancedHabitRecords
    };
  }
  
  async createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry> {
    const id = this.currentEntryId++;
    const newEntry: DailyEntry = { ...entry, id };
    this.dailyEntries.set(id, newEntry);
    return newEntry;
  }
  
  async updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined> {
    const existingEntry = this.dailyEntries.get(id);
    if (!existingEntry) {
      return undefined;
    }
    
    const updatedEntry: DailyEntry = { ...existingEntry, ...entry };
    this.dailyEntries.set(id, updatedEntry);
    return updatedEntry;
  }
  
  // Time record methods
  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    // Check if a record already exists for this entry and subcategory
    for (const [id, existingRecord] of this.timeRecords.entries()) {
      if (existingRecord.entryId === record.entryId && existingRecord.subcategoryId === record.subcategoryId) {
        // Update existing record instead of creating a new one
        const updatedRecord = { ...existingRecord, minutes: record.minutes };
        this.timeRecords.set(id, updatedRecord);
        return updatedRecord;
      }
    }
    
    // Create new record if none exists
    const id = this.currentTimeRecordId++;
    const newRecord: TimeRecord = { ...record, id };
    this.timeRecords.set(id, newRecord);
    return newRecord;
  }
  
  async updateTimeRecord(entryId: number, subcategoryId: number, minutes: number): Promise<TimeRecord | undefined> {
    // Find the record
    let record: TimeRecord | undefined;
    let recordId: number | undefined;
    
    for (const [id, timeRecord] of this.timeRecords.entries()) {
      if (timeRecord.entryId === entryId && timeRecord.subcategoryId === subcategoryId) {
        record = timeRecord;
        recordId = id;
        break;
      }
    }
    
    // If record doesn't exist, create it
    if (!record || recordId === undefined) {
      const newRecord: InsertTimeRecord = {
        entryId,
        subcategoryId,
        minutes
      };
      return this.createTimeRecord(newRecord);
    }
    
    // Update existing record
    const updatedRecord: TimeRecord = { ...record, minutes };
    this.timeRecords.set(recordId, updatedRecord);
    return updatedRecord;
  }
  
  // Habit record methods
  async createHabitRecord(record: InsertHabitRecord): Promise<HabitRecord> {
    // Check if a record already exists for this entry and subcategory
    for (const [id, existingRecord] of this.habitRecords.entries()) {
      if (existingRecord.entryId === record.entryId && existingRecord.subcategoryId === record.subcategoryId) {
        // Update existing record instead of creating a new one
        const updatedRecord = { ...existingRecord, completed: record.completed };
        this.habitRecords.set(id, updatedRecord);
        return updatedRecord;
      }
    }
    
    // Create new record if none exists
    const id = this.currentHabitRecordId++;
    const newRecord: HabitRecord = { ...record, id };
    this.habitRecords.set(id, newRecord);
    return newRecord;
  }
  
  async updateHabitRecord(entryId: number, subcategoryId: number, completed: boolean): Promise<HabitRecord | undefined> {
    // Find the record
    let record: HabitRecord | undefined;
    let recordId: number | undefined;
    
    for (const [id, habitRecord] of this.habitRecords.entries()) {
      if (habitRecord.entryId === entryId && habitRecord.subcategoryId === subcategoryId) {
        record = habitRecord;
        recordId = id;
        break;
      }
    }
    
    // If record doesn't exist, create it
    if (!record || recordId === undefined) {
      const newRecord: InsertHabitRecord = {
        entryId,
        subcategoryId,
        completed
      };
      return this.createHabitRecord(newRecord);
    }
    
    // Update existing record
    const updatedRecord: HabitRecord = { ...record, completed };
    this.habitRecords.set(recordId, updatedRecord);
    return updatedRecord;
  }
  
  // Setup default categories for the user
  async setupDefaultCategories(userId: number): Promise<void> {
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      
      // Create the category
      const category = await this.createCategory({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        goalHours: cat.goalHours,
        order: i,
        monthlyGoalHours: cat.goalHours * 30,
        goalPeriod: 'daily',
        prefix: cat.name.charAt(0).toUpperCase(),
        uuid: `category-${cat.name}-${Date.now()}`
      });
      
      // Create subcategories
      for (let j = 0; j < cat.subcategories.length; j++) {
        const sub = cat.subcategories[j];
        await this.createSubcategory({
          categoryId: category.id,
          name: sub.name,
          goalMinutes: sub.goalMinutes,
          goalType: sub.goalType,
          displayId: `${category.prefix}${j+1}`,
          priority: j
        });
      }
    }
  }
  
  // Dashboard data methods
  async getDashboardData(userId: number, date: Date): Promise<any> {
    const entry = await this.getDailyEntryByDate(userId, date);
    const categories = await this.getCategories(userId);
    
    // Constants for time limits
    const MAX_DAILY_HOURS = 24; // 24 hours per day
    const MAX_MONTHLY_HOURS = 730.001; // 730.001 hours per month (30 days)
    
    // Track total monthly and daily allocations
    let totalMonthlyGoalHours = 0;
    let totalDailyGoalHours = 0;
    
    // Separate monthly and daily categories
    const monthlyCategories: number[] = [];
    const dailyCategories: number[] = [];
    
    // First pass: calculate totals and categorize by goal period
    categories.forEach(category => {
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        totalMonthlyGoalHours += category.monthlyGoalHours;
        monthlyCategories.push(category.id);
      } else {
        totalDailyGoalHours += category.goalHours;
        dailyCategories.push(category.id);
      }
    });
    
    // Determine if adjustments are needed
    const monthlyAdjustmentRatio = totalMonthlyGoalHours > MAX_MONTHLY_HOURS 
      ? MAX_MONTHLY_HOURS / totalMonthlyGoalHours 
      : 1;
    
    const dailyAdjustmentRatio = totalDailyGoalHours > MAX_DAILY_HOURS 
      ? MAX_DAILY_HOURS / totalDailyGoalHours 
      : 1;
    
    // Process categories with adjustments if needed
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
      
      // Calculate the target hours based on goal period with applicable adjustments
      let targetGoalHours = category.goalHours;
      let adjustedGoalHours = targetGoalHours;
      
      // Apply monthly or daily adjustments as needed
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        targetGoalHours = category.monthlyGoalHours / 30; // Convert to daily equivalent
        
        // Apply monthly adjustment if needed
        if (monthlyAdjustmentRatio < 1) {
          const adjustedMonthlyHours = category.monthlyGoalHours * monthlyAdjustmentRatio;
          adjustedGoalHours = adjustedMonthlyHours / 30;
        } else {
          adjustedGoalHours = targetGoalHours;
        }
      } else if (dailyAdjustmentRatio < 1) {
        // Apply daily adjustment if needed
        adjustedGoalHours = category.goalHours * dailyAdjustmentRatio;
      }
      
      // Calculate progress based on the correct goal (but display against adjusted goal)
      const progress = adjustedGoalHours > 0 ? (actualHours / adjustedGoalHours) * 100 : 0;
      
      return {
        ...category,
        actualHours,
        progress: Math.min(progress, 100),
        // Include adjustment information
        originalGoalHours: category.goalPeriod === 'monthly' ? category.monthlyGoalHours / 30 : category.goalHours,
        adjustedGoalHours,
        isAdjusted: category.goalPeriod === 'monthly' 
          ? monthlyAdjustmentRatio < 1 
          : dailyAdjustmentRatio < 1
      };
    });
    
    // Calculate metrics
    const dailyScore = entry?.dailyScore || 0;
    const motivationLevel = entry?.motivationLevel || 0;
    const sleepDuration = entry?.sleepHours || 0;
    const healthBalance = entry?.healthBalance || 0;
    
    // Include adjustment metadata
    const timeConstraints = {
      daily: {
        totalHours: totalDailyGoalHours,
        maxHours: MAX_DAILY_HOURS,
        isAdjusted: dailyAdjustmentRatio < 1,
        adjustmentRatio: dailyAdjustmentRatio
      },
      monthly: {
        totalHours: totalMonthlyGoalHours,
        maxHours: MAX_MONTHLY_HOURS,
        isAdjusted: monthlyAdjustmentRatio < 1,
        adjustmentRatio: monthlyAdjustmentRatio
      }
    };
    
    return {
      dailyScore,
      motivationLevel,
      sleepDuration,
      healthBalance,
      categories: categoryData,
      timeConstraints
    };
  }
  
  // History data methods
  async getDailyEntriesInRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const entries: DailyEntry[] = [];
    for (const entry of this.dailyEntries.values()) {
      if (entry.userId === userId) {
        const entryDate = new Date(entry.date);
        if (entryDate >= start && entryDate <= end) {
          entries.push(entry);
        }
      }
    }
    
    // Get detailed entries
    const detailedEntries = await Promise.all(
      entries.map(async (entry) => {
        return this.getDailyEntryByDate(userId, entry.date);
      })
    );
    
    // Filter out undefined entries and sort by date
    return detailedEntries
      .filter((entry): entry is DailyEntryWithDetails => entry !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
}

// Database implementation of storage interface
export class DatabaseStorage implements IStorage {
  sessionStore: any;
  
  constructor() {
    // Setup session store
    const SessionStore = memoryStore(session);
    this.sessionStore = new SessionStore({
      checkPeriod: 86400000 // Prune expired entries every 24h
    });
  }
  
  // History data methods
  async getDailyEntriesInRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    // Get all daily entries within date range
    const entries = await db.select().from(dailyEntries)
      .where(and(
        eq(dailyEntries.userId, userId),
        gte(dailyEntries.date, startDate),
        lte(dailyEntries.date, endDate)
      ));
    
    // Get detailed info for each entry
    const detailedEntries = await Promise.all(
      entries.map(async (entry) => {
        return this.getDailyEntryByDate(userId, entry.date);
      })
    );
    
    // Filter out undefined entries and sort by date
    return detailedEntries
      .filter((entry): entry is DailyEntryWithDetails => entry !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const users = await db.select().from(this.users).where(eq(this.users.id, id));
    return users[0];
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const users = await db.select().from(this.users).where(eq(this.users.username, username));
    return users[0];
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const users = await db.select().from(this.users).where(eq(this.users.email, email));
    return users[0];
  }
  
  async createUser(user: InsertUser): Promise<User> {
    const results = await db.insert(this.users).values(user).returning();
    const newUser = results[0];
    
    // Create default categories
    await this.setupDefaultCategories(newUser.id);
    
    return newUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const results = await db.update(this.users)
      .set(userData)
      .where(eq(this.users.id, id))
      .returning();
    
    return results[0];
  }
  
  // Category methods
  async getCategories(userId: number): Promise<CategoryWithSubcategories[]> {
    // Get all categories for user
    const userCategories = await db.select().from(this.categories)
      .where(eq(this.categories.userId, userId))
      .orderBy(this.categories.order);
    
    // For each category, get subcategories
    const result: CategoryWithSubcategories[] = [];
    
    for (const category of userCategories) {
      const subcats = await this.getSubcategories(category.id);
      
      // Sort subcategories by priority
      subcats.sort((a, b) => {
        const priorityA = a.priority !== null ? a.priority : 999;
        const priorityB = b.priority !== null ? b.priority : 999;
        return priorityA - priorityB;
      });
      
      result.push({
        ...category,
        subcategories: subcats
      });
    }
    
    return result;
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const categories = await db.select().from(this.categories).where(eq(this.categories.id, id));
    return categories[0];
  }
  
  async createCategory(category: InsertCategory): Promise<Category> {
    const results = await db.insert(this.categories).values(category).returning();
    return results[0];
  }
  
  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const results = await db.update(this.categories)
      .set(category)
      .where(eq(this.categories.id, id))
      .returning();
    
    return results[0];
  }
  
  async deleteCategory(id: number): Promise<void> {
    // Get all subcategories
    const subcategories = await db.select().from(this.subcategories)
      .where(eq(this.subcategories.categoryId, id));
    
    // Delete all subcategory records first
    for (const subcategory of subcategories) {
      // Delete time records and habit records
      await db.delete(this.timeRecords)
        .where(eq(this.timeRecords.subcategoryId, subcategory.id));
      
      await db.delete(this.habitRecords)
        .where(eq(this.habitRecords.subcategoryId, subcategory.id));
    }
    
    // Delete all subcategories
    await db.delete(this.subcategories)
      .where(eq(this.subcategories.categoryId, id));
    
    // Finally delete the category
    await db.delete(this.categories)
      .where(eq(this.categories.id, id));
  }
  
  // Subcategory methods
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const subcategories = await db.select().from(this.subcategories)
      .where(eq(this.subcategories.id, id));
    
    return subcategories[0];
  }
  
  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    return db.select().from(this.subcategories)
      .where(eq(this.subcategories.categoryId, categoryId));
  }
  
  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    try {
      const results = await db.insert(this.subcategories).values(subcategory).returning();
      return results[0];
    } catch (error: any) {
      // Check if this might be a constraint error from the trigger
      if (error.message.includes('sub-category goals')) {
        throw new Error(`Subcategory goal cannot exceed category goal. ${error.message}`);
      }
      throw error;
    }
  }
  
  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined> {
    try {
      const results = await db.update(this.subcategories)
        .set(subcategory)
        .where(eq(this.subcategories.id, id))
        .returning();
      
      return results[0];
    } catch (error: any) {
      // Check if this might be a constraint error from the trigger
      if (error.message.includes('sub-category goals')) {
        throw new Error(`Subcategory goal cannot exceed category goal. ${error.message}`);
      }
      throw error;
    }
  }
  
  async deleteSubcategory(id: number): Promise<void> {
    // Delete time records and habit records first
    await db.delete(this.timeRecords)
      .where(eq(this.timeRecords.subcategoryId, id));
    
    await db.delete(this.habitRecords)
      .where(eq(this.habitRecords.subcategoryId, id));
    
    // Then delete the subcategory
    await db.delete(this.subcategories)
      .where(eq(this.subcategories.id, id));
  }
  
  // Daily entry methods
  async getDailyEntry(id: number): Promise<DailyEntry | undefined> {
    const entries = await db.select().from(this.dailyEntries)
      .where(eq(this.dailyEntries.id, id));
    
    return entries[0];
  }
  
  async getDailyEntryByDate(userId: number, date: Date): Promise<DailyEntryWithDetails | undefined> {
    // Get all entries for this user
    const entries = await db.select().from(this.dailyEntries)
      .where(eq(this.dailyEntries.userId, userId));
    
    // Format the target date to compare only year, month, day
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    const targetDateString = targetDate.toISOString().split('T')[0];
    
    // Find the matching entry
    let matchingEntry: DailyEntry | undefined;
    for (const entry of entries) {
      const entryDate = new Date(entry.date);
      const entryDateString = entryDate.toISOString().split('T')[0];
      
      if (entryDateString === targetDateString) {
        matchingEntry = entry;
        break;
      }
    }
    
    if (!matchingEntry) {
      return undefined;
    }
    
    // Get time records for this entry
    const timeRecordsData = await db.select()
      .from(this.timeRecords)
      .where(eq(this.timeRecords.entryId, matchingEntry.id));
    
    // Get habit records for this entry
    const habitRecordsData = await db.select()
      .from(this.habitRecords)
      .where(eq(this.habitRecords.entryId, matchingEntry.id));
    
    // Enhance time records with subcategory information
    const enhancedTimeRecords = await Promise.all(
      timeRecordsData.map(async (record) => {
        const subcategory = await this.getSubcategory(record.subcategoryId);
        if (!subcategory) {
          return {
            ...record,
            subcategory: { id: 0, name: 'Unknown', categoryId: 0, goalMinutes: 0, goalType: 'time', displayId: null, priority: null, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
          };
        }
        
        const category = await this.getCategory(subcategory.categoryId);
        if (!category) {
          return {
            ...record,
            subcategory: { ...subcategory, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
          };
        }
        
        return {
          ...record,
          subcategory: { ...subcategory, category }
        };
      })
    );
    
    // Enhance habit records with subcategory information
    const enhancedHabitRecords = await Promise.all(
      habitRecordsData.map(async (record) => {
        const subcategory = await this.getSubcategory(record.subcategoryId);
        if (!subcategory) {
          return {
            ...record,
            subcategory: { id: 0, name: 'Unknown', categoryId: 0, goalMinutes: 0, goalType: 'binary', displayId: null, priority: null, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
          };
        }
        
        const category = await this.getCategory(subcategory.categoryId);
        if (!category) {
          return {
            ...record,
            subcategory: { ...subcategory, category: { id: 0, name: 'Unknown', userId: 0, goalHours: 0, color: '#cccccc', icon: '', monthlyGoalHours: 0, goalPeriod: 'daily', order: 0, uuid: null, prefix: null } }
          };
        }
        
        return {
          ...record,
          subcategory: { ...subcategory, category }
        };
      })
    );
    
    return {
      ...matchingEntry,
      timeRecords: enhancedTimeRecords,
      habitRecords: enhancedHabitRecords
    };
  }
  
  async createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry> {
    const results = await db.insert(this.dailyEntries).values(entry).returning();
    return results[0];
  }
  
  async updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined> {
    const results = await db.update(this.dailyEntries)
      .set(entry)
      .where(eq(this.dailyEntries.id, id))
      .returning();
    
    return results[0];
  }
  
  // Time record methods
  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    // Check if record already exists
    const existingRecords = await db.select().from(this.timeRecords)
      .where(and(
        eq(this.timeRecords.entryId, record.entryId),
        eq(this.timeRecords.subcategoryId, record.subcategoryId)
      ));
    
    if (existingRecords.length > 0) {
      // Update existing record
      const updatedRecords = await db.update(this.timeRecords)
        .set({ minutes: record.minutes })
        .where(and(
          eq(this.timeRecords.entryId, record.entryId),
          eq(this.timeRecords.subcategoryId, record.subcategoryId)
        ))
        .returning();
      
      return updatedRecords[0];
    }
    
    // Create new record
    const results = await db.insert(this.timeRecords).values(record).returning();
    return results[0];
  }
  
  async updateTimeRecord(entryId: number, subcategoryId: number, minutes: number): Promise<TimeRecord | undefined> {
    // Check if record exists
    const existingRecords = await db.select().from(this.timeRecords)
      .where(and(
        eq(this.timeRecords.entryId, entryId),
        eq(this.timeRecords.subcategoryId, subcategoryId)
      ));
    
    if (existingRecords.length === 0) {
      // Create new record
      const newRecord = await this.createTimeRecord({
        entryId,
        subcategoryId,
        minutes
      });
      
      return newRecord;
    }
    
    // Update existing record
    const updatedRecords = await db.update(this.timeRecords)
      .set({ minutes })
      .where(and(
        eq(this.timeRecords.entryId, entryId),
        eq(this.timeRecords.subcategoryId, subcategoryId)
      ))
      .returning();
    
    return updatedRecords[0];
  }
  
  // Habit record methods
  async createHabitRecord(record: InsertHabitRecord): Promise<HabitRecord> {
    // Check if record already exists
    const existingRecords = await db.select().from(this.habitRecords)
      .where(and(
        eq(this.habitRecords.entryId, record.entryId),
        eq(this.habitRecords.subcategoryId, record.subcategoryId)
      ));
    
    if (existingRecords.length > 0) {
      // Update existing record
      const updatedRecords = await db.update(this.habitRecords)
        .set({ completed: record.completed })
        .where(and(
          eq(this.habitRecords.entryId, record.entryId),
          eq(this.habitRecords.subcategoryId, record.subcategoryId)
        ))
        .returning();
      
      return updatedRecords[0];
    }
    
    // Create new record
    const results = await db.insert(this.habitRecords).values(record).returning();
    return results[0];
  }
  
  async updateHabitRecord(entryId: number, subcategoryId: number, completed: boolean): Promise<HabitRecord | undefined> {
    // Check if record exists
    const existingRecords = await db.select().from(this.habitRecords)
      .where(and(
        eq(this.habitRecords.entryId, entryId),
        eq(this.habitRecords.subcategoryId, subcategoryId)
      ));
    
    if (existingRecords.length === 0) {
      // Create new record
      const newRecord = await this.createHabitRecord({
        entryId,
        subcategoryId,
        completed
      });
      
      return newRecord;
    }
    
    // Update existing record
    const updatedRecords = await db.update(this.habitRecords)
      .set({ completed })
      .where(and(
        eq(this.habitRecords.entryId, entryId),
        eq(this.habitRecords.subcategoryId, subcategoryId)
      ))
      .returning();
    
    return updatedRecords[0];
  }
  
  // Setup default categories for the user
  async setupDefaultCategories(userId: number): Promise<void> {
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      
      // Create the category
      const results = await db.insert(this.categories).values({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        goalHours: cat.goalHours,
        order: i,
        monthlyGoalHours: cat.goalHours * 30,
        goalPeriod: 'daily',
        prefix: cat.name.charAt(0).toUpperCase(),
        uuid: `category-${cat.name}-${Date.now()}`
      }).returning();
      
      const category = results[0];
      
      // Create subcategories
      for (let j = 0; j < cat.subcategories.length; j++) {
        const sub = cat.subcategories[j];
        await db.insert(this.subcategories).values({
          categoryId: category.id,
          name: sub.name,
          goalMinutes: sub.goalMinutes,
          goalType: sub.goalType as 'time' | 'binary',
          displayId: `${category.prefix}${j+1}`,
          priority: j
        });
      }
    }
  }
  
  // Dashboard data method
  async getDashboardData(userId: number, date: Date): Promise<any> {
    const entry = await this.getDailyEntryByDate(userId, date);
    const categories = await this.getCategories(userId);
    
    // Constants for time limits
    const MAX_DAILY_HOURS = 24; // 24 hours per day
    const MAX_MONTHLY_HOURS = 730.001; // 730.001 hours per month (30 days)
    
    // Track total monthly and daily allocations
    let totalMonthlyGoalHours = 0;
    let totalDailyGoalHours = 0;
    
    // Separate monthly and daily categories
    const monthlyCategories: number[] = [];
    const dailyCategories: number[] = [];
    
    // First pass: calculate totals and categorize by goal period
    categories.forEach(category => {
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        totalMonthlyGoalHours += category.monthlyGoalHours;
        monthlyCategories.push(category.id);
      } else {
        totalDailyGoalHours += category.goalHours;
        dailyCategories.push(category.id);
      }
    });
    
    // Determine if adjustments are needed
    const monthlyAdjustmentRatio = totalMonthlyGoalHours > MAX_MONTHLY_HOURS 
      ? MAX_MONTHLY_HOURS / totalMonthlyGoalHours 
      : 1;
    
    const dailyAdjustmentRatio = totalDailyGoalHours > MAX_DAILY_HOURS 
      ? MAX_DAILY_HOURS / totalDailyGoalHours 
      : 1;
    
    // Process categories with adjustments if needed
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
      
      // Calculate the target hours based on goal period with applicable adjustments
      let targetGoalHours = category.goalHours;
      let adjustedGoalHours = targetGoalHours;
      
      // Apply monthly or daily adjustments as needed
      if (category.goalPeriod === 'monthly' && category.monthlyGoalHours) {
        targetGoalHours = category.monthlyGoalHours / 30; // Convert to daily equivalent
        
        // Apply monthly adjustment if needed
        if (monthlyAdjustmentRatio < 1) {
          const adjustedMonthlyHours = category.monthlyGoalHours * monthlyAdjustmentRatio;
          adjustedGoalHours = adjustedMonthlyHours / 30;
        } else {
          adjustedGoalHours = targetGoalHours;
        }
      } else if (dailyAdjustmentRatio < 1) {
        // Apply daily adjustment if needed
        adjustedGoalHours = category.goalHours * dailyAdjustmentRatio;
      }
      
      // Calculate progress based on the correct goal (but display against adjusted goal)
      const progress = adjustedGoalHours > 0 ? (actualHours / adjustedGoalHours) * 100 : 0;
      
      return {
        ...category,
        actualHours,
        progress: Math.min(progress, 100),
        // Include adjustment information
        originalGoalHours: category.goalPeriod === 'monthly' ? category.monthlyGoalHours / 30 : category.goalHours,
        adjustedGoalHours,
        isAdjusted: category.goalPeriod === 'monthly' 
          ? monthlyAdjustmentRatio < 1 
          : dailyAdjustmentRatio < 1
      };
    });
    
    // Calculate metrics
    const dailyScore = entry?.dailyScore || 0;
    const motivationLevel = entry?.motivationLevel || 0;
    const sleepDuration = entry?.sleepHours || 0;
    const healthBalance = entry?.healthBalance || 0;
    
    // Include adjustment metadata
    const timeConstraints = {
      daily: {
        totalHours: totalDailyGoalHours,
        maxHours: MAX_DAILY_HOURS,
        isAdjusted: dailyAdjustmentRatio < 1,
        adjustmentRatio: dailyAdjustmentRatio
      },
      monthly: {
        totalHours: totalMonthlyGoalHours,
        maxHours: MAX_MONTHLY_HOURS,
        isAdjusted: monthlyAdjustmentRatio < 1,
        adjustmentRatio: monthlyAdjustmentRatio
      }
    };
    
    return {
      dailyScore,
      motivationLevel,
      sleepDuration,
      healthBalance,
      categories: categoryData,
      timeConstraints
    };
  }
  
  // Class properties aliases to simplify code (avoid repeating imports)
  private get users() { return users; }
  private get categories() { return categories; }
  private get subcategories() { return subcategories; }
  private get dailyEntries() { return dailyEntries; }
  private get timeRecords() { return timeRecords; }
  private get habitRecords() { return habitRecords; }
}

// Use the database storage implementation
// We'll create and export the actual storage instance in the index.ts file
// to avoid circular dependencies
export const storage = new DatabaseStorage();
