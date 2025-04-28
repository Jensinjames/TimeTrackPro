import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerApiRoutes } from "./api";
import { setupAuth } from "./auth";
import { logger } from "./lib/logger";
import { createServer } from "http";

// Initialize Express application
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
      
      // Also log to our structured logger at appropriate level
      if (res.statusCode >= 500) {
        logger.error(`Request failed: ${req.method} ${path}`, 'api', 
          { statusCode: res.statusCode, duration }, req.user?.id, path);
      } else if (res.statusCode >= 400) {
        logger.warn(`Request error: ${req.method} ${path}`, 'api', 
          { statusCode: res.statusCode, duration }, req.user?.id, path);
      } else {
        logger.debug(`Request completed: ${req.method} ${path}`, 'api', 
          { statusCode: res.statusCode, duration }, req.user?.id, path);
      }
    }
  });

  next();
});

(async () => {
  // Create HTTP server
  const server = createServer(app);
  
  // Setup authentication
  setupAuth(app);
  
  // Register legacy routes for backwards compatibility
  await registerRoutes(app);
  
  // Register modular API routes
  registerApiRoutes(app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    logger.error(`Unhandled error: ${message}`, 'global', { status, stack: err.stack });
    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite for development or serve static files in production
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
