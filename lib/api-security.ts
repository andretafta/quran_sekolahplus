import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, type AppJWTPayload } from './auth';
import { rateLimit } from './rate-limit';

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGINS || '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

// API Response wrapper for consistent responses
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
  requestId: string;
}

export function createApiResponse<T>(
  data?: T,
  message?: string,
  success = true,
  requestId = generateRequestId()
): ApiResponse<T> {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

export function createErrorResponse(
  error: string,
  requestId = generateRequestId()
): ApiResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    requestId,
  };
}

// Generate unique request ID for tracking
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Input sanitization
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .trim();
  }

  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }

  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value);
    }
    return sanitized;
  }

  return input;
}

// API middleware wrapper
export function withApiSecurity(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    requireAuth?: boolean;
    rateLimit?: { requests: number; window: number };
    allowedMethods?: string[];
    requireTier?: 'individual' | 'school' | 'both';
  } = {}
) {
  return async (req: NextRequest, context?: any) => {
    const requestId = generateRequestId();

    try {
      // Add security headers
      const response = NextResponse.next();
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });

      // Handle CORS preflight
      if (req.method === 'OPTIONS') {
        const corsResponse = new NextResponse(null, { status: 200 });
        Object.entries(corsHeaders).forEach(([key, value]) => {
          corsResponse.headers.set(key, value);
        });
        return corsResponse;
      }

      // Check allowed methods
      if (
        options.allowedMethods &&
        !options.allowedMethods.includes(req.method)
      ) {
        return NextResponse.json(
          createErrorResponse('Method not allowed', requestId),
          { status: 405 }
        );
      }

      // Apply rate limiting
      if (options.rateLimit) {
        const rateLimitResult = await rateLimit(
          req,
          options.rateLimit.requests,
          options.rateLimit.window
        );

        if (!rateLimitResult.success) {
          return NextResponse.json(
            createErrorResponse('Rate limit exceeded', requestId),
            {
              status: 429,
              headers: {
                'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
              },
            }
          );
        }
      }

      // Authentication check
      if (options.requireAuth) {
        const token = req.cookies.get('auth-token')?.value;
        if (!token) {
          return NextResponse.json(
            createErrorResponse('Authentication required', requestId),
            { status: 401 }
          );
        }

        const payload: AppJWTPayload | null = await verifyToken(token);
        if (!payload) {
          return NextResponse.json(
            createErrorResponse('Invalid or expired token', requestId),
            { status: 401 }
          );
        }

        // Check tier requirements
        if (options.requireTier && options.requireTier !== 'both') {
          if (payload.tier !== options.requireTier) {
            return NextResponse.json(
              createErrorResponse('Insufficient permissions', requestId),
              { status: 403 }
            );
          }
        }

        // Add user info to request headers
        const requestHeaders = new Headers(req.headers);
        requestHeaders.set('x-user-id', String(payload.userId));
        requestHeaders.set('x-user-email', String(payload.email));
        requestHeaders.set('x-user-tier', String(payload.tier));
        requestHeaders.set('x-request-id', requestId);

        const newRequest = new NextRequest(req.url, {
          method: req.method,
          headers: requestHeaders,
          body: req.body,
        });

        return await handler(newRequest, context);
      }

      // If no auth required, just pass request ID
      const requestHeaders = new Headers(req.headers);
      requestHeaders.set('x-request-id', requestId);

      const newRequest = new NextRequest(req.url, {
        method: req.method,
        headers: requestHeaders,
        body: req.body,
      });

      return await handler(newRequest, context);
    } catch (error) {
      console.error('[v0] API Security Error:', error);
      return NextResponse.json(
        createErrorResponse('Internal server error', requestId),
        { status: 500 }
      );
    }
  };
}

// Validate request body against schema
export async function validateRequestBody<T>(
  req: NextRequest,
  schema: any
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await req.json();
    const sanitizedBody = sanitizeInput(body);
    const validatedData = schema.parse(sanitizedBody);

    return { success: true, data: validatedData };
  } catch (error: any) {
    if (error.errors) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid request body' };
  }
}
