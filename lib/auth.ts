// src/lib/auth.ts

import { SignJWT, jwtVerify, type JWTPayload as JoseJWTPayload } from 'jose';
import bcrypt from 'bcryptjs';
import { db } from './database';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ||
    'your-super-secret-jwt-key-change-in-production-minimum-32-characters'
);
const JWT_EXPIRES_IN = '7d';

export interface User {
  tier: string;
  id: string;
  email: string;
  fullName: string;
  role: 'saas_owner' | 'admin' | 'teacher' | 'student';
  organizationId: string | null;
  isActive: boolean;
  emailVerified: boolean;
  organization?: {
    id: string;
    name: string;
    type: 'individual' | 'school';
    tier: 'free' | 'premium';
    subscription_status?: 'active' | 'suspended' | 'cancelled'; // Tambahkan ini
  };
}

// Extend jose.JWTPayload biar kompatibel dengan iat, exp, dll
export interface AppJWTPayload extends JoseJWTPayload {
  userId: string;
  email: string;
  role: 'saas_owner' | 'admin' | 'teacher' | 'student';
  organizationId: string | null;
}

// Hash password with bcrypt
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export async function generateToken(user: User): Promise<string> {
  try {
    const payload: AppJWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(JWT_EXPIRES_IN)
      .sign(JWT_SECRET);

    return token;
  } catch (error) {
    console.error('[v0] Error generating token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

export async function verifyToken(
  token: string
): Promise<AppJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as AppJWTPayload;
  } catch (error) {
    console.error('[v0] Error verifying token:', error);
    return null;
  }
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    console.log('[v0] getCurrentUser called from API route');

    const cookieStore = cookies();
    console.log('[v0] Cookie store accessed');

    const token = (await cookieStore).get('auth-token')?.value;
    console.log('[v0] Auth token from cookies:', token ? 'Found' : 'Not found');

    if (!token) {
      console.log('[v0] No auth token found in cookies');
      return null;
    }

    console.log('[v0] Calling getCurrentUserFromToken with token');
    const user = await getCurrentUserFromToken(token);
    console.log(
      '[v0] getCurrentUserFromToken result:',
      user ? `User found: ${user.email}` : 'No user found'
    );

    return user;
  } catch (error) {
    console.error('[v0] Error getting current user:', error);
    return null;
  }
}

export async function getCurrentUserFromToken(
  token: string
): Promise<User | null> {
  try {
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Fetch user from database WITH organization info and status
    const user = await db.findUserByEmail(payload.email);

    // PERIKSA STATUS AKTIF PENGGUNA
    if (!user || !user.is_active) {
      console.log(`[v0] User ${payload.email} is inactive or not found.`);
      return null;
    }

    // PERIKSA STATUS ORGANISASI PENGGUNA
    // Abaikan SaaS owner karena mereka tidak terikat pada satu organisasi
    if (
      user.role !== 'saas_owner' &&
      user.organization &&
      (user.organization.subscription_status === 'suspended' ||
        user.organization.subscription_status === 'cancelled')
    ) {
      console.log(`[v0] User ${user.email} is from a suspended organization.`);
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      tier: user.tier,
      role: user.role,
      organizationId: user.organization_id,
      isActive: user.is_active,
      emailVerified: user.email_verified,
      organization: user.organization,
    };
  } catch (error) {
    console.error('[v0] Error getting current user:', error);
    return null;
  }
}

// Generate secure random token for email verification/password reset
export function generateSecureToken(): string {
  return require('crypto').randomBytes(32).toString('hex');
}

// Function to hash JWT tokens for database storage
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createUserSession(
  user: User,
  ipAddress?: string,
  userAgent?: string
) {
  const token = await generateToken(user);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 hari

  await db.createSession({
    userId: user.id,
    tokenHash: hashToken(token), // Hash token to fit in varchar(255)
    expiresAt,
    ipAddress,
    userAgent,
  });

  return token; // Return original token for cookie
}

export async function validateSession(token: string): Promise<User | null> {
  try {
    const payload = await verifyToken(token);
    if (!payload) return null;

    // Ambil session dari DB berdasarkan userId
    const session = await db.findValidSession(payload.userId);
    if (!session) return null;

    if (session.tokenHash !== hashToken(token)) return null;

    // Cek expired
    if (new Date(session.expiresAt) < new Date()) return null;

    return {
      id: session.user.id,
      email: session.user.email,
      tier: session.user.tier,
      fullName: session.user.full_name,
      role: session.user.role,
      organizationId: session.user.organization_id,
      isActive: session.user.is_active,
      emailVerified: session.user.email_verified,
    };
  } catch (error) {
    console.error('[v0] Error validating session:', error);
    return null;
  }
}

export async function logoutUser(token?: string) {
  if (token) {
    try {
      const payload = await verifyToken(token);
      if (payload) {
        await db.invalidateSession(payload.userId);
      }
    } catch (error) {
      console.error('[v0] Error invalidating session:', error);
    }
  }
}

export function hasPermission(user: User, requiredRole: User['role']): boolean {
  const roleHierarchy = {
    saas_owner: 4,
    admin: 3,
    teacher: 2,
    student: 1,
  };

  return roleHierarchy[user.role] >= roleHierarchy[requiredRole];
}

export function canAccessOrganization(
  user: User,
  organizationId: string
): boolean {
  if (user.role === 'saas_owner') return true;
  return user.organizationId === organizationId;
}
