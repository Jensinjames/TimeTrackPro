/**
 * Logger utility with structured logging capabilities
 * for better observability and monitoring
 */

// Define log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Define log message structure
export interface LogMessage {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: string;
  data?: any;
  userId?: number;
  route?: string;
  error?: Error;
}

// Create a centralized logger class
export class Logger {
  private static instance: Logger;
  private logStore: LogMessage[] = [];
  private maxLogSize = 1000; // Limit in-memory logs to prevent memory issues
  
  private constructor() {}
  
  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
  
  /**
   * Log a message with structured metadata
   */
  public log(
    level: LogLevel,
    message: string,
    context?: string,
    data?: any,
    userId?: number,
    route?: string,
    error?: Error
  ): void {
    const logEntry: LogMessage = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      data,
      userId,
      route,
      error,
    };
    
    // Store log in memory (limited size)
    this.logStore.push(logEntry);
    if (this.logStore.length > this.maxLogSize) {
      this.logStore.shift(); // Remove oldest log if we exceed max size
    }
    
    // Output to console with proper formatting
    const prefix = `[${logEntry.timestamp}] [${level.toUpperCase()}]${context ? ` [${context}]` : ''}`;
    
    switch (level) {
      case LogLevel.ERROR:
        console.error(`${prefix}: ${message}`, error || '', data || '');
        break;
      case LogLevel.WARN:
        console.warn(`${prefix}: ${message}`, data || '');
        break;
      case LogLevel.INFO:
        console.info(`${prefix}: ${message}`, data || '');
        break;
      case LogLevel.DEBUG:
        console.debug(`${prefix}: ${message}`, data || '');
        break;
    }
    
    // In a production environment, you would integrate with a logging service here
    // Example: send to Logflare, CloudWatch, or other logging service
  }
  
  // Convenience methods
  public error(message: string, context?: string, data?: any, userId?: number, route?: string, error?: Error): void {
    this.log(LogLevel.ERROR, message, context, data, userId, route, error);
  }
  
  public warn(message: string, context?: string, data?: any, userId?: number, route?: string): void {
    this.log(LogLevel.WARN, message, context, data, userId, route);
  }
  
  public info(message: string, context?: string, data?: any, userId?: number, route?: string): void {
    this.log(LogLevel.INFO, message, context, data, userId, route);
  }
  
  public debug(message: string, context?: string, data?: any, userId?: number, route?: string): void {
    this.log(LogLevel.DEBUG, message, context, data, userId, route);
  }
  
  // Get recent logs (for admin purposes)
  public getRecentLogs(count: number = 100): LogMessage[] {
    return this.logStore.slice(-count);
  }
  
  // Get logs filtered by level
  public getLogsByLevel(level: LogLevel, count: number = 100): LogMessage[] {
    return this.logStore
      .filter(log => log.level === level)
      .slice(-count);
  }
}

// Export a singleton instance
export const logger = Logger.getInstance();