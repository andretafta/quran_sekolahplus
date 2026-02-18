import type { NextRequest } from 'next/server';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export async function rateLimit(
  req: NextRequest,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  // Get client identifier (IP address or user ID)
  const clientId = getClientId(req);
  const now = Date.now();
  const windowStart = now - windowMs;

  // Clean up expired entries
  cleanupExpiredEntries(windowStart);

  // Get or create rate limit entry
  const entry = rateLimitStore.get(clientId) || {
    count: 0,
    resetTime: now + windowMs,
  };

  // Reset if window has passed
  if (now > entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + windowMs;
  }

  // Check if limit exceeded
  if (entry.count >= limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      success: false,
      limit,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  // Increment counter
  entry.count++;
  rateLimitStore.set(clientId, entry);

  return {
    success: true,
    limit,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

function getClientId(req: NextRequest): string {
  // Try to get user ID from headers first (for authenticated requests)
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const ip =
    req.headers.get('x-forwarded-for') ||
    req.headers.get('x-real-ip') ||
    'unknown';
  return `ip:${ip}`;
}

function cleanupExpiredEntries(windowStart: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < windowStart) {
      rateLimitStore.delete(key);
    }
  }
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  auth: { requests: 5, window: 15 * 60 * 1000 }, // 5 requests per 15 minutes
  api: { requests: 100, window: 60 * 1000 }, // 100 requests per minute
  upload: { requests: 10, window: 60 * 1000 }, // 10 uploads per minute
  strict: { requests: 10, window: 60 * 1000 }, // 10 requests per minute
};
