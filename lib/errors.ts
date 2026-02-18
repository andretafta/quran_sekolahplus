// Custom error classes for better error handling

export class AuthError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: Error) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Error response helper
export function createErrorResponse(error: Error, status = 500) {
  console.error('[v0] Error:', error);

  if (error instanceof AuthError) {
    return { error: error.message, code: error.code };
  }

  if (error instanceof ValidationError) {
    return { error: error.message, field: error.field };
  }

  if (error instanceof DatabaseError) {
    return { error: 'Terjadi kesalahan database' };
  }

  return { error: 'Terjadi kesalahan server' };
}
