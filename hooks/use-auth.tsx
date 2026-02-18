'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import type { JSX } from 'react/jsx-runtime';

// === User Type ===
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'saas_owner' | 'admin' | 'teacher' | 'student';
  organizationId: string | null;
  branchId: string | null;
  emailVerified: boolean;
}

// === Register Payload ===
interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'student';
  organizationType?: 'individual' | 'school';
  organizationName?: string;
  organizationSlug?: string;
}

// === Context Type ===
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  register: (
    data: RegisterData
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // === Check current session ===
  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user ?? null);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('[v0] Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // === Login ===
  const login = async (email: string, password: string) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setUser(data.user);
        if (data.user.role === 'saas_owner') {
          router.push('/owner');
        } else {
          router.push('/admin');
        }
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('[v0] Login error:', error);
      return { success: false, error: 'Terjadi kesalahan jaringan' };
    }
  };

  // === Register ===
  const register = async (registerData: RegisterData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registerData,
          // supaya konsisten null, bukan undefined
          organizationType: registerData.organizationType ?? null,
          organizationName: registerData.organizationName ?? null,
          organizationSlug: registerData.organizationSlug ?? null,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('[v0] Register error:', error);
      return { success: false, error: 'Terjadi kesalahan jaringan' };
    }
  };

  // === Logout ===
  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      router.push('/login');
    } catch (error) {
      console.error('[v0] Logout error:', error);
      setUser(null);
      router.push('/login');
    }
  };

  // === Refresh user ===
  const refreshUser = async () => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// === Hook ===
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// === Require Auth Hook ===
export function useRequireAuth() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  return { user, loading };
}

// === Permissions Hook ===
export function usePermissions() {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const permissions = {
      saas_owner: ['*'],
      admin: [
        'manage_organization',
        'manage_branches',
        'manage_teachers',
        'manage_students',
        'view_all_progress',
        'access_premium_content',
        'generate_reports',
        'manage_billing',
      ],
      teacher: [
        'manage_students',
        'view_student_progress',
        'access_premium_content',
        'generate_reports',
        'update_own_profile',
      ],
      student: [
        'read_own_progress',
        'update_own_profile',
        'access_basic_content',
      ],
    };

    if (user.role === 'saas_owner') return true;

    return permissions[user.role]?.includes(permission) ?? false;
  };

  return {
    hasPermission,
    isSaasOwner: user?.role === 'saas_owner',
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    canManageOrganization: hasPermission('manage_organization'),
    canManageStudents: hasPermission('manage_students'),
    canAccessPremiumContent: hasPermission('access_premium_content'),
    canGenerateReports: hasPermission('generate_reports'),
  };
}
