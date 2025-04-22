import { pgTable, text, serial, integer, boolean, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  name: text("name"),
  emailReminders: boolean("email_reminders").default(true),
  weeklySummary: boolean("weekly_summary").default(true),
  goalAchievement: boolean("goal_achievement").default(true),
  reminderTime: text("reminder_time").default("18:00"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  name: true,
  emailReminders: true,
  weeklySummary: true,
  goalAchievement: true,
  reminderTime: true,
});

// Categories schema
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon").notNull(),
  goalHours: real("goal_hours").notNull(), // Daily goal hours
  monthlyGoalHours: real("monthly_goal_hours").notNull().default(0), // Monthly goal hours
  goalPeriod: text("goal_period").notNull().default("daily"), // Goal period type: 'daily' or 'monthly'
  order: integer("order").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Subcategories schema
export const subcategories = pgTable("subcategories", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").notNull(),
  name: text("name").notNull(),
  goalMinutes: integer("goal_minutes").notNull(),
  goalType: text("goal_type").notNull().default("time"), // "time" or "binary"
});

export const insertSubcategorySchema = createInsertSchema(subcategories).omit({
  id: true,
});

// Daily entries schema
export const dailyEntries = pgTable("daily_entries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  sleepHours: real("sleep_hours").default(0),
  dailyScore: real("daily_score").default(0),
  motivationLevel: real("motivation_level").default(0),
  healthBalance: real("health_balance").default(0),
  unaccountedMinutes: integer("unaccounted_minutes").default(0),
});

export const insertDailyEntrySchema = createInsertSchema(dailyEntries).omit({
  id: true,
});

// Entry time records schema
export const timeRecords = pgTable("time_records", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  subcategoryId: integer("subcategory_id").notNull(),
  minutes: integer("minutes").notNull().default(0),
});

export const insertTimeRecordSchema = createInsertSchema(timeRecords).omit({
  id: true,
});

// Binary habit records schema
export const habitRecords = pgTable("habit_records", {
  id: serial("id").primaryKey(),
  entryId: integer("entry_id").notNull(),
  subcategoryId: integer("subcategory_id").notNull(),
  completed: boolean("completed").notNull().default(false),
});

export const insertHabitRecordSchema = createInsertSchema(habitRecords).omit({
  id: true,
});

// Define default categories and subcategories
export const defaultCategories = [
  {
    name: "Faith",
    color: "#16A34A",
    icon: "pray",
    goalHours: 1, // Daily goal of 1 hour
    monthlyGoalHours: 30, // Monthly goal of 30 hours
    goalPeriod: "monthly", // Use monthly goal period by default
    subcategories: [
      { name: "Daily Prayer", goalMinutes: 30, goalType: "time" },
      { name: "Meditation", goalMinutes: 20, goalType: "time" },
      { name: "Scripture Study", goalMinutes: 30, goalType: "time" },
    ],
  },
  {
    name: "Life",
    color: "#D97706",
    icon: "sun",
    goalHours: 2,
    monthlyGoalHours: 60,
    goalPeriod: "daily",
    subcategories: [
      { name: "Family Time", goalMinutes: 180, goalType: "time" },
      { name: "Social Activities", goalMinutes: 360, goalType: "time" },
      { name: "Hobbies", goalMinutes: 300, goalType: "time" },
    ],
  },
  {
    name: "Work",
    color: "#DC2626",
    icon: "briefcase",
    goalHours: 8,
    monthlyGoalHours: 160,
    goalPeriod: "daily",
    subcategories: [
      { name: "Lamb co.TimberWild", goalMinutes: 960, goalType: "time" },
      { name: "Partnership", goalMinutes: 480, goalType: "time" },
      { name: "Networking", goalMinutes: 240, goalType: "time" },
      { name: "Cold Calling", goalMinutes: 120, goalType: "time" },
    ],
  },
  {
    name: "Health",
    color: "#EC4899",
    icon: "heart",
    goalHours: 2,
    monthlyGoalHours: 60,
    goalPeriod: "daily",
    subcategories: [
      { name: "Exercise", goalMinutes: 300, goalType: "time" },
      { name: "Sleep", goalMinutes: 480, goalType: "time" },
      { name: "Wake up at 5 AM", goalMinutes: 0, goalType: "binary" },
      { name: "Workout", goalMinutes: 0, goalType: "binary" },
      { name: "Eat Healthy", goalMinutes: 0, goalType: "binary" },
      { name: "Drink Water", goalMinutes: 0, goalType: "binary" },
    ],
  },
];

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = z.infer<typeof insertSubcategorySchema>;
export type DailyEntry = typeof dailyEntries.$inferSelect;
export type InsertDailyEntry = z.infer<typeof insertDailyEntrySchema>;
export type TimeRecord = typeof timeRecords.$inferSelect;
export type InsertTimeRecord = z.infer<typeof insertTimeRecordSchema>;
export type HabitRecord = typeof habitRecords.$inferSelect;
export type InsertHabitRecord = z.infer<typeof insertHabitRecordSchema>;

// Extended types for frontend use
export type CategoryWithSubcategories = Category & {
  subcategories: Subcategory[];
};

export type DailyEntryWithDetails = DailyEntry & {
  timeRecords: (TimeRecord & { subcategory: Subcategory & { category: Category } })[];
  habitRecords: (HabitRecord & { subcategory: Subcategory & { category: Category } })[];
};

export type DashboardData = {
  dailyScore: number;
  motivationLevel: number;
  sleepDuration: number;
  healthBalance: number;
  categories: (CategoryWithSubcategories & {
    actualHours: number;
    progress: number;
  })[];
  // For unaccounted time tracking
  unaccountedMinutes?: number;
  totalDays?: number;
};
