import fs from 'fs';
import path from 'path';

// Log file paths at project root
const LOG_DIR = process.cwd();
const REQUEST_LOG = path.join(LOG_DIR, 'request.log');
const ERROR_LOG = path.join(LOG_DIR, 'error.log');

/**
 * Format log entry with timestamp
 */
function formatLogEntry(level: string, message: string, data?: unknown): string {
  const timestamp = new Date().toISOString();
  const dataStr = data ? `\n${JSON.stringify(data, null, 2)}` : '';
  return `[${timestamp}] [${level}] ${message}${dataStr}\n`;
}

/**
 * Append to log file safely
 */
function appendToLog(filePath: string, content: string): void {
  try {
    fs.appendFileSync(filePath, content, 'utf8');
  } catch (err) {
    // Fallback to console if file write fails
    console.error('Failed to write to log file:', err);
    console.log('Log content:', content);
  }
}

/**
 * Log request/response information
 * Used for logging all API requests and their responses
 */
export function logRequest(
  method: string,
  url: string,
  statusCode: number,
  metadata?: {
    duration?: string;
    userId?: string;
    error?: string;
    requestBody?: unknown;
    responseBody?: unknown;
  }
): void {
  const message = `${method} ${url} - Status: ${statusCode}`;
  const logEntry = formatLogEntry('REQUEST', message, metadata);
  appendToLog(REQUEST_LOG, logEntry);
}

/**
 * Log error information
 * Used for logging all errors that occur in the application
 */
export function logError(
  error: Error | unknown,
  context?: string,
  metadata?: {
    userId?: string;
    url?: string;
    method?: string;
    requestBody?: unknown;
  }
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  const message = context ? `${context}: ${errorMessage}` : errorMessage;

  const logData = {
    ...metadata,
    stack,
    timestamp: new Date().toISOString(),
  };

  const logEntry = formatLogEntry('ERROR', message, logData);
  appendToLog(ERROR_LOG, logEntry);

  // Also log to console for development
  console.error(`[ERROR] ${message}`, logData);
}

/**
 * Log informational messages
 */
export function logInfo(message: string, data?: unknown): void {
  const logEntry = formatLogEntry('INFO', message, data);
  appendToLog(REQUEST_LOG, logEntry);
  console.log(`[INFO] ${message}`, data);
}

/**
 * Log warning messages
 */
export function logWarning(message: string, data?: unknown): void {
  const logEntry = formatLogEntry('WARNING', message, data);
  appendToLog(ERROR_LOG, logEntry);
  console.warn(`[WARNING] ${message}`, data);
}

