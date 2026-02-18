import { cookies } from 'next/headers';
import {
  getCurrentUserFromToken as getUserFromToken,
  logoutUser,
} from './auth';

// Server-only function to get current user from cookies
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) return null;

    return await getUserFromToken(token);
  } catch (error) {
    console.error('[v0] Error getting current user:', error);
    return null;
  }
}

// Server-only function to set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// Server-only function to clear auth cookie
export async function clearAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete('auth-token');
}

// Server-only function to get current user from token
export async function getCurrentUserFromToken(token: string) {
  try {
    return await getUserFromToken(token);
  } catch (error) {
    console.error('[v0] Error getting current user from token:', error);
    return null;
  }
}

// Server-only function to logout user from token
export async function logoutUserFromToken(token: string) {
  try {
    return await logoutUser(token);
  } catch (error) {
    console.error('[v0] Error logging out user:', error);
    throw error;
  }
}
