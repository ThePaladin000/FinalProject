import { NextResponse } from 'next/server';
import { logError } from './logger';

/**
 * Custom API Error class for structured error responses
 */
export class ApiError extends Error {
  statusCode: number;
  context?: string;

  constructor(message: string, statusCode: number = 500, context?: string) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.context = context;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Specific error classes for different HTTP status codes
 */
export class BadRequestError extends ApiError {
  constructor(message: string = 'Invalid request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Access forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict') {
    super(message, 409);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error') {
    super(message, 500);
  }
}

/**
 * Centralized error handler for API routes
 * This is the main error handling function that all API routes should use
 */
export function handleApiError(
  error: unknown,
  context?: string,
  metadata?: {
    userId?: string;
    url?: string;
    method?: string;
    requestBody?: unknown;
  }
): NextResponse {
  // Log the error
  logError(error, context, metadata);

  // Handle known API errors
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        context: error.context,
      },
      { status: error.statusCode }
    );
  }

  // Handle unknown errors - don't expose internal details to client
  const isDevelopment = process.env.NODE_ENV === 'development';
  const errorMessage = isDevelopment && error instanceof Error
    ? error.message
    : 'Internal server error';

  return NextResponse.json(
    { error: errorMessage },
    { status: 500 }
  );
}

/**
 * Async error wrapper for API route handlers
 * Wraps async functions to catch errors and handle them centrally
 */
export function withErrorHandler<T extends unknown[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<R | NextResponse> {
  return async (...args: T): Promise<R | NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error) as R;
    }
  };
}

