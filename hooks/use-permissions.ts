'use client';

import { useState, useEffect } from 'react';
import type { User } from '@/lib/auth';

interface UsePermissionsReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  isSaasOwner: boolean;
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  checkPermission: (requiredRole: User['role']) => boolean;
  checkOrganizationAccess: (organizationId: string) => boolean;
  refetch: () => Promise<void>;
}

export function usePermissions(): UsePermissionsReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[v0] usePermissions - Fetching user data');
      const response = await fetch('/api/auth/me');

      if (response.ok) {
        const userData = await response.json();
        console.log('[v0] usePermissions - User data received:', {
          role: userData.user?.role,
          email: userData.user?.email,
        });
        setUser(userData.user);
      } else if (response.status === 401) {
        console.log('[v0] usePermissions - User not authenticated');
        setUser(null);
      } else {
        throw new Error('Failed to fetch user data');
      }
    } catch (err) {
      console.error('[v0] usePermissions - Error fetching user:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const checkPermission = (requiredRole: User['role']): boolean => {
    if (!user) return false;

    // SaaS owner has access to everything
    if (user.role === 'saas_owner') return true;

    // Check specific role
    return user.role === requiredRole;
  };

  const checkOrganizationAccess = (organizationId: string): boolean => {
    if (!user) return false;

    // SaaS owner has access to all organizations
    if (user.role === 'saas_owner') return true;

    // Check if user belongs to the organization
    return user.organizationId === organizationId;
  };

  return {
    user,
    loading,
    error,
    isSaasOwner: user?.role === 'saas_owner',
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    checkPermission,
    checkOrganizationAccess,
    refetch: fetchUser,
  };
}
