import { type NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'your-super-secret-jwt-key-change-in-production-minimum-32-characters'
);

interface JWTPayload {
  userId: string;
  email: string;
  role: 'saas_owner' | 'admin' | 'teacher' | 'student';
  organizationId: string | null;
  branchId: string | null;
  iat: number;
  exp: number;
}

async function verifyTokenMiddleware(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    // FIX: cast via unknown dulu supaya aman
    return payload as unknown as JWTPayload;
  } catch (error) {
    return null;
  }
}

// Define role-based route access
const roleRoutes = {
  saas_owner: ['/owner'],
  admin: ['/admin', '/dashboard', '/manage'],
  teacher: ['/dashboard', '/classes', '/students'],
  student: ['/dashboard', '/progress', '/assignments'],
};

// Public routes that don't require authentication
const publicRoutes = ['/', '/about', '/pricing', '/contact'];
const authRoutes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;

  // Allow public routes
  if (
    publicRoutes.some(
      (route) => pathname === route || pathname.startsWith(route)
    )
  ) {
    return NextResponse.next();
  }

  // Handle auth routes (redirect if already logged in)
  if (authRoutes.some((route) => pathname.startsWith(route))) {
    if (token) {
      const payload = await verifyTokenMiddleware(token);
      if (payload) {
        // Redirect based on role
        const redirectUrl =
          payload.role === 'saas_owner' ? '/owner' : '/dashboard';
        return NextResponse.redirect(new URL(redirectUrl, request.url));
      }
    }
    return NextResponse.next();
  }

  // All other routes require authentication
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  const payload = await verifyTokenMiddleware(token);
  if (!payload) {
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('auth-token');
    return response;
  }

  // Check role-based access
  const userRole = payload.role as keyof typeof roleRoutes;
  const allowedRoutes = roleRoutes[userRole] || [];

  const hasAccess = allowedRoutes.some((route) => pathname.startsWith(route));

  if (!hasAccess) {
    // Redirect to appropriate dashboard based on role
    const defaultRoute = userRole === 'saas_owner' ? '/owner' : '/dashboard';
    return NextResponse.redirect(new URL(defaultRoute, request.url));
  }

  // Add user info to headers for API routes
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-user-id', payload.userId);
  requestHeaders.set('x-user-email', payload.email);
  requestHeaders.set('x-user-role', payload.role);
  requestHeaders.set('x-organization-id', payload.organizationId || '');
  requestHeaders.set('x-branch-id', payload.branchId || '');

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|placeholder.svg).*)',
  ],
};
