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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private categories: Map<number, Category>;
  private subcategories: Map<number, Subcategory>;
  private dailyEntries: Map<number, DailyEntry>;
  private timeRecords: Map<number, TimeRecord>;
  private habitRecords: Map<number, HabitRecord>;
  
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
    
    this.currentUserId = 1;
    this.currentCategoryId = 1;
    this.currentSubcategoryId = 1;
    this.currentEntryId = 1;
    this.currentTimeRecordId = 1;
    this.currentHabitRecordId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;
    
    const updatedUser: User = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Category methods
  async getCategories(userId: number): Promise<CategoryWithSubcategories[]> {
    const userCategories = Array.from(this.categories.values())
      .filter(cat => cat.userId === userId)
      .sort((a, b) => a.order - b.order);
      
    return Promise.all(
      userCategories.map(async (category) => {
        const subs = await this.getSubcategories(category.id);
        return { ...category, subcategories: subs };
      })
    );
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
    if (!existingCategory) return undefined;
    
    const updatedCategory: Category = { ...existingCategory, ...category };
    this.categories.set(id, updatedCategory);
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    // Delete subcategories first
    const subcats = await this.getSubcategories(id);
    for (const subcat of subcats) {
      await this.deleteSubcategory(subcat.id);
    }
    
    this.categories.delete(id);
  }

  // Subcategory methods
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    return this.subcategories.get(id);
  }

  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    return Array.from(this.subcategories.values())
      .filter(sub => sub.categoryId === categoryId);
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    const id = this.currentSubcategoryId++;
    const newSubcategory: Subcategory = { ...subcategory, id };
    this.subcategories.set(id, newSubcategory);
    return newSubcategory;
  }

  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined> {
    const existingSubcategory = this.subcategories.get(id);
    if (!existingSubcategory) return undefined;
    
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
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    const entry = Array.from(this.dailyEntries.values()).find(
      (entry) => 
        entry.userId === userId && 
        entry.date >= startOfDay && 
        entry.date <= endOfDay
    );
    
    if (!entry) return undefined;
    
    // Get time records for this entry
    const entryTimeRecords = Array.from(this.timeRecords.values())
      .filter(record => record.entryId === entry.id)
      .map(record => {
        const subcategory = this.subcategories.get(record.subcategoryId);
        if (!subcategory) {
          throw new Error(`Subcategory not found: ${record.subcategoryId}`);
        }
        
        const category = this.categories.get(subcategory.categoryId);
        if (!category) {
          throw new Error(`Category not found: ${subcategory.categoryId}`);
        }
        
        return {
          ...record,
          subcategory: { ...subcategory, category }
        };
      });
    
    // Get habit records for this entry
    const entryHabitRecords = Array.from(this.habitRecords.values())
      .filter(record => record.entryId === entry.id)
      .map(record => {
        const subcategory = this.subcategories.get(record.subcategoryId);
        if (!subcategory) {
          throw new Error(`Subcategory not found: ${record.subcategoryId}`);
        }
        
        const category = this.categories.get(subcategory.categoryId);
        if (!category) {
          throw new Error(`Category not found: ${subcategory.categoryId}`);
        }
        
        return {
          ...record,
          subcategory: { ...subcategory, category }
        };
      });
    
    return { 
      ...entry, 
      timeRecords: entryTimeRecords,
      habitRecords: entryHabitRecords
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
    if (!existingEntry) return undefined;
    
    const updatedEntry: DailyEntry = { ...existingEntry, ...entry };
    this.dailyEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  // Time record methods
  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    const id = this.currentTimeRecordId++;
    const newRecord: TimeRecord = { ...record, id };
    this.timeRecords.set(id, newRecord);
    return newRecord;
  }

  async updateTimeRecord(entryId: number, subcategoryId: number, minutes: number): Promise<TimeRecord | undefined> {
    const record = Array.from(this.timeRecords.values()).find(
      r => r.entryId === entryId && r.subcategoryId === subcategoryId
    );
    
    if (!record) {
      // Create new record if it doesn't exist
      const newRecord: InsertTimeRecord = {
        entryId,
        subcategoryId,
        minutes
      };
      return this.createTimeRecord(newRecord);
    }
    
    // Update existing record
    const updatedRecord: TimeRecord = { ...record, minutes };
    this.timeRecords.set(record.id, updatedRecord);
    return updatedRecord;
  }

  // Habit record methods
  async createHabitRecord(record: InsertHabitRecord): Promise<HabitRecord> {
    const id = this.currentHabitRecordId++;
    const newRecord: HabitRecord = { ...record, id };
    this.habitRecords.set(id, newRecord);
    return newRecord;
  }

  async updateHabitRecord(entryId: number, subcategoryId: number, completed: boolean): Promise<HabitRecord | undefined> {
    const record = Array.from(this.habitRecords.values()).find(
      r => r.entryId === entryId && r.subcategoryId === subcategoryId
    );
    
    if (!record) {
      // Create new record if it doesn't exist
      const newRecord: InsertHabitRecord = {
        entryId,
        subcategoryId,
        completed
      };
      return this.createHabitRecord(newRecord);
    }
    
    // Update existing record
    const updatedRecord: HabitRecord = { ...record, completed };
    this.habitRecords.set(record.id, updatedRecord);
    return updatedRecord;
  }

  // Setup default categories for new user
  async setupDefaultCategories(userId: number): Promise<void> {
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      // Create category with UUID and prefix
      const category = await this.createCategory({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        goalHours: cat.goalHours,
        uuid: uuidv4(), // Generate UUID for category
        prefix: cat.prefix, // Use prefix from default category
        monthlyGoalHours: cat.monthlyGoalHours || 0,
        goalPeriod: cat.goalPeriod || "daily",
        order: i
      });
      
      // Create subcategories with display IDs
      for (const sub of cat.subcategories) {
        await this.createSubcategory({
          categoryId: category.id,
          name: sub.name,
          goalMinutes: sub.goalMinutes,
          goalType: sub.goalType,
          displayId: sub.displayId || `${cat.prefix}${sub.priority || 0}`, // Use provided display ID or generate one
          priority: sub.priority || 0
        });
      }
    }
  }
  
  // Get daily entries in date range
  async getDailyEntriesInRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    const entries = Array.from(this.dailyEntries.values())
      .filter(entry => 
        entry.userId === userId && 
        entry.date >= startDate && 
        entry.date <= endDate
      )
      .sort((a, b) => a.date.getTime() - b.date.getTime());
      
    return entries;
  }

  // Dashboard data method
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
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  async getDailyEntriesInRange(userId: number, startDate: Date, endDate: Date): Promise<any[]> {
    try {
      const entries = await db
        .select()
        .from(dailyEntries)
        .where(
          and(
            eq(dailyEntries.userId, userId),
            gte(dailyEntries.date, startDate),
            lte(dailyEntries.date, endDate)
          )
        )
        .orderBy(dailyEntries.date);
      
      return entries;
    } catch (error) {
      console.error("Error fetching daily entries in range:", error);
      return [];
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    try {
      const [updatedUser] = await db
        .update(users)
        .set(userData)
        .where(eq(users.id, id))
        .returning();
        
      return updatedUser;
    } catch (error) {
      console.error("Error updating user:", error);
      return undefined;
    }
  }

  // Category methods
  async getCategories(userId: number): Promise<CategoryWithSubcategories[]> {
    const userCategories = await db.select().from(categories)
      .where(eq(categories.userId, userId))
      .orderBy(categories.order);

    const result: CategoryWithSubcategories[] = [];
    
    for (const category of userCategories) {
      const subList = await this.getSubcategories(category.id);
      result.push({
        ...category,
        subcategories: subList
      });
    }
    
    return result;
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [createdCategory] = await db.insert(categories).values(category).returning();
    return createdCategory;
  }

  async updateCategory(id: number, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updatedCategory] = await db.update(categories)
      .set(category)
      .where(eq(categories.id, id))
      .returning();
    return updatedCategory;
  }

  async deleteCategory(id: number): Promise<void> {
    // Get subcategories to delete
    const subcats = await this.getSubcategories(id);
    
    // Delete each subcategory (which will also delete related time/habit records)
    for (const subcat of subcats) {
      await this.deleteSubcategory(subcat.id);
    }
    
    // Delete the category itself
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Subcategory methods
  async getSubcategory(id: number): Promise<Subcategory | undefined> {
    const [subcategory] = await db.select().from(subcategories).where(eq(subcategories.id, id));
    return subcategory;
  }

  async getSubcategories(categoryId: number): Promise<Subcategory[]> {
    return db.select().from(subcategories).where(eq(subcategories.categoryId, categoryId));
  }

  async createSubcategory(subcategory: InsertSubcategory): Promise<Subcategory> {
    try {
      // Check if the subcategory goal minutes exceed category goal
      if (subcategory.goalMinutes > 0) {
        // Get the parent category
        const category = await this.getCategory(subcategory.categoryId);
        if (!category) {
          throw new Error("Parent category not found");
        }
        
        // Get all existing subcategories for this category
        const existingSubcategories = await this.getSubcategories(category.categoryId);
        
        // Calculate total minutes allocated to existing subcategories
        const totalExistingMinutes = existingSubcategories.reduce(
          (sum, sub) => sum + sub.goalMinutes, 0
        );
        
        // Calculate the category's total goal minutes
        const categoryTotalMinutes = category.goalPeriod === 'monthly' 
          ? (category.monthlyGoalHours * 60)
          : (category.goalHours * 60);
        
        // Calculate available minutes
        const availableMinutes = Math.max(0, categoryTotalMinutes - totalExistingMinutes);
        
        // Add a small tolerance (0.5% of category total) to account for rounding errors
        const toleranceMinutes = Math.max(1, Math.min(15, Math.ceil(categoryTotalMinutes * 0.005)));
        
        // Log the validation values
        console.log(`CREATE VALIDATION: Category ${category.id} - Requested: ${subcategory.goalMinutes}, Available: ${availableMinutes}, Tolerance: ${toleranceMinutes}`);
        
        // Only throw error if it exceeds by more than the tolerance
        if (subcategory.goalMinutes > (availableMinutes + toleranceMinutes)) {
          throw new Error(`Subcategory goal cannot exceed ${Math.floor(availableMinutes / 60)} hours ${availableMinutes % 60} minutes (tolerance: ${toleranceMinutes} minutes)`);
        }
        
        // If it's within tolerance but still over, adjust it to exactly match the max
        if (subcategory.goalMinutes > availableMinutes) {
          console.log(`ADJUSTING NEW: Requested ${subcategory.goalMinutes} minutes adjusted to ${availableMinutes} minutes (within tolerance)`);
          subcategory.goalMinutes = availableMinutes;
        }
      }
      
      // If checks pass, create the subcategory
      const [createdSubcategory] = await db.insert(subcategories).values(subcategory).returning();
      return createdSubcategory;
    } catch (error) {
      console.error("Error in createSubcategory:", error);
      throw error;
    }
  }

  async updateSubcategory(id: number, subcategory: Partial<InsertSubcategory>): Promise<Subcategory | undefined> {
    try {
      // If we're updating goalMinutes, verify it doesn't exceed the parent category goal
      if (subcategory.goalMinutes !== undefined) {
        // First get the existing subcategory to find its category
        const existingSubcategory = await this.getSubcategory(id);
        if (!existingSubcategory) {
          throw new Error("Subcategory not found");
        }
        
        // Get the parent category
        const category = await this.getCategory(existingSubcategory.categoryId);
        if (!category) {
          throw new Error("Parent category not found");
        }
        
        // Get all subcategories for this category
        const allSubcategories = await this.getSubcategories(category.categoryId);
        
        // Calculate total minutes for all subcategories except this one
        const totalOtherSubcategoryMinutes = allSubcategories
          .filter(sub => sub.id !== id)
          .reduce((sum, sub) => sum + sub.goalMinutes, 0);
        
        // Calculate the maximum allowed for this subcategory
        // Use the daily or monthly goals based on the category's goalPeriod
        const categoryTotalMinutes = category.goalPeriod === 'monthly' 
          ? (category.monthlyGoalHours * 60)
          : (category.goalHours * 60);
          
        const maxAllowedMinutes = Math.max(0, categoryTotalMinutes - totalOtherSubcategoryMinutes);
        
        // Add a small tolerance (0.5% of total category goal) to account for rounding errors
        const toleranceMinutes = Math.max(1, Math.min(15, Math.ceil(categoryTotalMinutes * 0.005)));
        
        // Only throw error if it exceeds by more than the tolerance
        if (subcategory.goalMinutes > (maxAllowedMinutes + toleranceMinutes)) {
          console.log(`VALIDATION ERROR: Requested ${subcategory.goalMinutes} minutes, Max allowed: ${maxAllowedMinutes} minutes, Tolerance: ${toleranceMinutes} minutes`);
          throw new Error(`Subcategory goal cannot exceed ${Math.floor(maxAllowedMinutes / 60)} hours ${maxAllowedMinutes % 60} minutes (tolerance: ${toleranceMinutes} minutes)`);
        }
        
        // If it's within tolerance but still over, adjust it to exactly match the max
        if (subcategory.goalMinutes > maxAllowedMinutes) {
          console.log(`ADJUSTING: Requested ${subcategory.goalMinutes} minutes adjusted to ${maxAllowedMinutes} minutes (within tolerance)`);
          subcategory.goalMinutes = maxAllowedMinutes;
        }
      }
      
      // If no issues, proceed with the update
      const [updatedSubcategory] = await db.update(subcategories)
        .set(subcategory)
        .where(eq(subcategories.id, id))
        .returning();
      return updatedSubcategory;
    } catch (error) {
      console.error("Error in updateSubcategory:", error);
      throw error;
    }
  }

  async deleteSubcategory(id: number): Promise<void> {
    // First delete time records and habit records associated with this subcategory
    await db.delete(timeRecords).where(eq(timeRecords.subcategoryId, id));
    await db.delete(habitRecords).where(eq(habitRecords.subcategoryId, id));
    
    // Then delete the subcategory
    await db.delete(subcategories).where(eq(subcategories.id, id));
  }

  // Daily entry methods
  async getDailyEntry(id: number): Promise<DailyEntry | undefined> {
    const [entry] = await db.select().from(dailyEntries).where(eq(dailyEntries.id, id));
    return entry;
  }

  async getDailyEntryByDate(userId: number, date: Date): Promise<DailyEntryWithDetails | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Find the daily entry for this date
    const [entry] = await db.select().from(dailyEntries)
      .where(
        and(
          eq(dailyEntries.userId, userId),
          gte(dailyEntries.date, startOfDay),
          lte(dailyEntries.date, endOfDay)
        )
      );
    
    if (!entry) return undefined;
    
    // Get time records for this entry
    const entryTimeRecords = await db.select().from(timeRecords)
      .where(eq(timeRecords.entryId, entry.id));
    
    // Get habit records for this entry
    const entryHabitRecords = await db.select().from(habitRecords)
      .where(eq(habitRecords.entryId, entry.id));
    
    // Enrich records with subcategory and category info
    const timeRecordsWithDetails = [];
    for (const record of entryTimeRecords) {
      const subcategory = await this.getSubcategory(record.subcategoryId);
      if (subcategory) {
        const category = await this.getCategory(subcategory.categoryId);
        if (category) {
          timeRecordsWithDetails.push({
            ...record,
            subcategory: { ...subcategory, category }
          });
        }
      }
    }
    
    const habitRecordsWithDetails = [];
    for (const record of entryHabitRecords) {
      const subcategory = await this.getSubcategory(record.subcategoryId);
      if (subcategory) {
        const category = await this.getCategory(subcategory.categoryId);
        if (category) {
          habitRecordsWithDetails.push({
            ...record,
            subcategory: { ...subcategory, category }
          });
        }
      }
    }
    
    return {
      ...entry,
      timeRecords: timeRecordsWithDetails,
      habitRecords: habitRecordsWithDetails
    };
  }

  async createDailyEntry(entry: InsertDailyEntry): Promise<DailyEntry> {
    const [createdEntry] = await db.insert(dailyEntries).values(entry).returning();
    return createdEntry;
  }

  async updateDailyEntry(id: number, entry: Partial<InsertDailyEntry>): Promise<DailyEntry | undefined> {
    const [updatedEntry] = await db.update(dailyEntries)
      .set(entry)
      .where(eq(dailyEntries.id, id))
      .returning();
    return updatedEntry;
  }

  // Time record methods
  async createTimeRecord(record: InsertTimeRecord): Promise<TimeRecord> {
    const [createdRecord] = await db.insert(timeRecords).values(record).returning();
    return createdRecord;
  }

  async updateTimeRecord(entryId: number, subcategoryId: number, minutes: number): Promise<TimeRecord | undefined> {
    // Check if record already exists
    const [existingRecord] = await db.select().from(timeRecords)
      .where(
        and(
          eq(timeRecords.entryId, entryId),
          eq(timeRecords.subcategoryId, subcategoryId)
        )
      );
    
    if (!existingRecord) {
      // Create new record
      return this.createTimeRecord({
        entryId,
        subcategoryId,
        minutes
      });
    }
    
    // Update existing record
    const [updatedRecord] = await db.update(timeRecords)
      .set({ minutes })
      .where(eq(timeRecords.id, existingRecord.id))
      .returning();
    return updatedRecord;
  }

  // Habit record methods
  async createHabitRecord(record: InsertHabitRecord): Promise<HabitRecord> {
    const [createdRecord] = await db.insert(habitRecords).values(record).returning();
    return createdRecord;
  }

  async updateHabitRecord(entryId: number, subcategoryId: number, completed: boolean): Promise<HabitRecord | undefined> {
    // Check if record already exists
    const [existingRecord] = await db.select().from(habitRecords)
      .where(
        and(
          eq(habitRecords.entryId, entryId),
          eq(habitRecords.subcategoryId, subcategoryId)
        )
      );
    
    if (!existingRecord) {
      // Create new record
      return this.createHabitRecord({
        entryId,
        subcategoryId,
        completed
      });
    }
    
    // Update existing record
    const [updatedRecord] = await db.update(habitRecords)
      .set({ completed })
      .where(eq(habitRecords.id, existingRecord.id))
      .returning();
    return updatedRecord;
  }

  // Setup default categories
  async setupDefaultCategories(userId: number): Promise<void> {
    for (let i = 0; i < defaultCategories.length; i++) {
      const cat = defaultCategories[i];
      const category = await this.createCategory({
        userId,
        name: cat.name,
        color: cat.color,
        icon: cat.icon,
        goalHours: cat.goalHours,
        order: i
      });
      
      // Create subcategories
      for (const sub of cat.subcategories) {
        await this.createSubcategory({
          categoryId: category.id,
          name: sub.name,
          goalMinutes: sub.goalMinutes,
          goalType: sub.goalType
        });
      }
    }
  }

  // Dashboard data method
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
}

// Use the database storage implementation
// We'll create and export the actual storage instance in the index.ts file
// to avoid circular dependencies
export const storage = new DatabaseStorage();
