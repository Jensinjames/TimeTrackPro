import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, users } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log(`Comparing supplied password with stored hash: ${stored.substring(0, 20)}...`);
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.error("Invalid stored password format - missing hash or salt");
      return false;
    }
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    const result = timingSafeEqual(hashedBuf, suppliedBuf);
    console.log(`Password comparison result: ${result}`);
    return result;
  } catch (error) {
    console.error("Error comparing passwords:", error);
    return false;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "very-secret-key-for-development-only",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days instead of 7
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Only secure in production
      sameSite: "lax",
      path: '/'
    }
  };

  app.set("trust proxy", 1);
  
  // Log incoming requests to help diagnose session issues
  app.use((req, res, next) => {
    const cookies = req.headers.cookie || 'no cookies';
    if (req.path === '/api/user' || req.path === '/api/dashboard') {
      console.log(`Auth debug - Request to ${req.path} - Cookies: ${cookies.substring(0, 40)}...`);
    }
    next();
  });
  
  app.use(session(sessionSettings));
  
  app.use((req, res, next) => {
    if (req.path === '/api/user' || req.path === '/api/dashboard') {
      console.log(`Auth debug - Session ID: ${req.sessionID?.substring(0, 10) || 'none'}`);
    }
    next();
  });
  
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Login attempt for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        }
        
        console.log(`User found: ${username}, id: ${user.id}`);
        const isPasswordValid = await comparePasswords(password, user.password);
        
        if (!isPasswordValid) {
          console.log(`Invalid password for user: ${username}`);
          return done(null, false, { message: "Invalid username or password" });
        } else {
          console.log(`Successful login for user: ${username}`);
          return done(null, user);
        }
      } catch (error) {
        console.error(`Error during authentication:`, error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user ID: ${user.id}`);
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user ID: ${id}`);
      const user = await storage.getUser(id);
      
      if (!user) {
        console.log(`User not found during deserialization: ${id}`);
        return done(null, false);
      }
      
      done(null, user);
    } catch (error) {
      console.error(`Error during user deserialization:`, error);
      done(error, false);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, email, name } = req.body;
      
      // Validate required fields
      if (!username || !password || !email) {
        return res.status(400).json({ message: "Username, password, and email are required" });
      }
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // Create user with hashed password
      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        email,
        name: name || username,
        emailReminders: true
      });
      
      // Setup default categories for the new user
      await storage.setupDefaultCategories(user.id);
      
      // Login the new user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    // Return user without password
    const { password, ...userWithoutPassword } = req.user;
    res.json(userWithoutPassword);
  });
  
  // Temporary reset password endpoint for testing
  app.post("/api/reset-password", async (req, res, next) => {
    try {
      const { username, newPassword } = req.body;
      
      if (!username || !newPassword) {
        return res.status(400).json({ message: "Username and new password are required" });
      }
      
      const user = await storage.getUserByUsername(username);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Update user with new hashed password directly in database
      const hashedPassword = await hashPassword(newPassword);
      await db.update(users)
        .set({ password: hashedPassword })
        .where(eq(users.id, user.id));
      
      console.log(`Password reset for user: ${username}`);
      
      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      next(error);
    }
  });
}
