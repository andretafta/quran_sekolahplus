import { db } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';
import { getCurrentTenant } from '@/lib/tenant';

export interface TierFeature {
  id: string;
  name: string;
  description: string;
  category: string;
  isActive: boolean;
}

export interface TierPlan {
  id: string;
  name: string;
  tier: 'individual' | 'school';
  price: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  limits: TierLimits;
  isPopular: boolean;
  isActive: boolean;
}

export interface TierLimits {
  maxStudents?: number;
  maxTeachers?: number;
  maxBranches?: number;
  storageGB?: number;
  apiCallsPerMonth?: number;
  supportLevel: 'basic' | 'priority' | 'premium';
  customBranding: boolean;
  advancedReports: boolean;
  apiAccess: boolean;
}

export interface UserSubscription {
  id: string;
  userId: string;
  tenantId?: string;
  planId: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  usage: UsageStats;
}

export interface UsageStats {
  studentsCount: number;
  teachersCount: number;
  branchesCount: number;
  storageUsedGB: number;
  apiCallsThisMonth: number;
  lastUpdated: Date;
}

// Default tier plans
export const defaultTierPlans: TierPlan[] = [
  {
    id: 'individual-monthly',
    name: 'Individual',
    tier: 'individual',
    price: 0,
    currency: 'IDR',
    billingCycle: 'monthly',
    features: [
      'read_own_progress',
      'update_own_profile',
      'access_basic_content',
      'basic_tahfiz_tracking',
      'progress_reports',
    ],
    limits: {
      maxStudents: 1,
      maxTeachers: 0,
      maxBranches: 1,
      storageGB: 1,
      apiCallsPerMonth: 1000,
      supportLevel: 'basic',
      customBranding: false,
      advancedReports: false,
      apiAccess: false,
    },
    isPopular: false,
    isActive: true,
  },
  {
    id: 'school-basic-monthly',
    name: 'School Basic',
    tier: 'school',
    price: 299000,
    currency: 'IDR',
    billingCycle: 'monthly',
    features: [
      'read_own_progress',
      'update_own_profile',
      'access_basic_content',
      'manage_students',
      'view_student_progress',
      'access_premium_content',
      'generate_reports',
      'class_management',
      'attendance_tracking',
    ],
    limits: {
      maxStudents: 50,
      maxTeachers: 5,
      maxBranches: 1,
      storageGB: 10,
      apiCallsPerMonth: 10000,
      supportLevel: 'priority',
      customBranding: false,
      advancedReports: true,
      apiAccess: true,
    },
    isPopular: true,
    isActive: true,
  },
  {
    id: 'school-premium-monthly',
    name: 'School Premium',
    tier: 'school',
    price: 599000,
    currency: 'IDR',
    billingCycle: 'monthly',
    features: [
      'read_own_progress',
      'update_own_profile',
      'access_basic_content',
      'manage_students',
      'view_student_progress',
      'access_premium_content',
      'generate_reports',
      'class_management',
      'attendance_tracking',
      'advanced_analytics',
      'custom_curriculum',
      'parent_portal',
      'mobile_app_access',
    ],
    limits: {
      maxStudents: 200,
      maxTeachers: 20,
      maxBranches: 3,
      storageGB: 50,
      apiCallsPerMonth: 50000,
      supportLevel: 'premium',
      customBranding: true,
      advancedReports: true,
      apiAccess: true,
    },
    isPopular: false,
    isActive: true,
  },
];

// Get user's current subscription
export async function getCurrentSubscription(): Promise<UserSubscription | null> {
  try {
    const user = await getCurrentUser();
    const tenant = await getCurrentTenant();

    if (!user) return null;

    const subscriptions = await db.query(
      `SELECT * FROM subscriptions 
       WHERE user_id = $1 AND (tenant_id = $2 OR tenant_id IS NULL) 
       AND status = 'active' 
       ORDER BY created_at DESC LIMIT 1`,
      [user.id, tenant?.id || null]
    );

    return subscriptions.length > 0 ? mapSubscription(subscriptions[0]) : null;
  } catch (error) {
    console.error('[v0] Get current subscription error:', error);
    return null;
  }
}

// Check if user has specific feature access
export async function hasFeatureAccess(feature: string): Promise<boolean> {
  try {
    const user = await getCurrentUser();
    if (!user) return false;

    // Get user's tier permissions
    const permissions = await db.query(
      'SELECT permission FROM tier_permissions WHERE tier = $1 AND permission = $2',
      [user.tier, feature]
    );

    return permissions.length > 0;
  } catch (error) {
    console.error('[v0] Check feature access error:', error);
    return false;
  }
}

// Check usage limits
export async function checkUsageLimit(limitType: keyof TierLimits): Promise<{
  allowed: boolean;
  current: number;
  limit: number;
  percentage: number;
}> {
  try {
    const subscription = await getCurrentSubscription();
    const user = await getCurrentUser();

    if (!subscription || !user) {
      return { allowed: false, current: 0, limit: 0, percentage: 0 };
    }

    const plan = defaultTierPlans.find((p) => p.id === subscription.planId);
    if (!plan) {
      return { allowed: false, current: 0, limit: 0, percentage: 0 };
    }

    const limit = plan.limits[limitType] as number;
    if (typeof limit !== 'number') {
      return { allowed: true, current: 0, limit: 0, percentage: 0 };
    }

    let current = 0;

    // Get current usage based on limit type
    switch (limitType) {
      case 'maxStudents':
        current = subscription.usage.studentsCount;
        break;
      case 'maxTeachers':
        current = subscription.usage.teachersCount;
        break;
      case 'maxBranches':
        current = subscription.usage.branchesCount;
        break;
      case 'storageGB':
        current = subscription.usage.storageUsedGB;
        break;
      case 'apiCallsPerMonth':
        current = subscription.usage.apiCallsThisMonth;
        break;
      default:
        current = 0;
    }

    const percentage = limit > 0 ? (current / limit) * 100 : 0;
    const allowed = current < limit;

    return { allowed, current, limit, percentage };
  } catch (error) {
    console.error('[v0] Check usage limit error:', error);
    return { allowed: false, current: 0, limit: 0, percentage: 0 };
  }
}

// Update usage stats
export async function updateUsageStats(tenantId: string): Promise<void> {
  try {
    // Count students
    const studentsResult = await db.query(
      "SELECT COUNT(*) as count FROM profiles WHERE branch_id = $1 AND tier = 'individual'",
      [tenantId]
    );

    // Count teachers
    const teachersResult = await db.query(
      "SELECT COUNT(*) as count FROM profiles WHERE branch_id = $1 AND tier = 'school'",
      [tenantId]
    );

    // Count branches (for multi-branch organizations)
    const branchesResult = await db.query(
      'SELECT COUNT(*) as count FROM branches WHERE owner_email = $1',
      [(await getCurrentUser())?.email]
    );

    // Update subscription usage
    await db.query(
      `UPDATE subscriptions 
       SET usage = jsonb_set(
         jsonb_set(
           jsonb_set(usage, '{studentsCount}', $1::text::jsonb),
           '{teachersCount}', $2::text::jsonb
         ),
         '{branchesCount}', $3::text::jsonb
       ),
       updated_at = NOW()
       WHERE tenant_id = $4`,
      [
        studentsResult[0]?.count || 0,
        teachersResult[0]?.count || 0,
        branchesResult[0]?.count || 0,
        tenantId,
      ]
    );
  } catch (error) {
    console.error('[v0] Update usage stats error:', error);
  }
}

// Get available plans for upgrade
export async function getAvailablePlans(
  currentTier?: 'individual' | 'school'
): Promise<TierPlan[]> {
  return defaultTierPlans.filter((plan) => {
    if (!currentTier) return plan.isActive;
    if (currentTier === 'individual') return plan.isActive;
    return plan.isActive && plan.tier === 'school';
  });
}

// Create subscription
export async function createSubscription(
  planId: string,
  tenantId?: string
): Promise<UserSubscription | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;

    const plan = defaultTierPlans.find((p) => p.id === planId);
    if (!plan) return null;

    const now = new Date();
    const periodEnd = new Date(now);
    if (plan.billingCycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    const result = await db.query(
      `INSERT INTO subscriptions (
        user_id, tenant_id, plan_id, status, current_period_start, current_period_end, usage
      ) VALUES ($1, $2, $3, 'active', $4, $5, $6) RETURNING *`,
      [
        user.id,
        tenantId || null,
        planId,
        now,
        periodEnd,
        JSON.stringify({
          studentsCount: 0,
          teachersCount: 0,
          branchesCount: 0,
          storageUsedGB: 0,
          apiCallsThisMonth: 0,
          lastUpdated: now,
        }),
      ]
    );

    return result.length > 0 ? mapSubscription(result[0]) : null;
  } catch (error) {
    console.error('[v0] Create subscription error:', error);
    return null;
  }
}

// Feature gate component helper
export async function canAccessFeature(feature: string): Promise<boolean> {
  const hasAccess = await hasFeatureAccess(feature);
  return hasAccess;
}

// Map database subscription to interface
function mapSubscription(sub: any): UserSubscription {
  return {
    id: sub.id,
    userId: sub.user_id,
    tenantId: sub.tenant_id,
    planId: sub.plan_id,
    status: sub.status,
    currentPeriodStart: new Date(sub.current_period_start),
    currentPeriodEnd: new Date(sub.current_period_end),
    cancelAtPeriodEnd: sub.cancel_at_period_end || false,
    usage: sub.usage
      ? JSON.parse(sub.usage)
      : {
          studentsCount: 0,
          teachersCount: 0,
          branchesCount: 0,
          storageUsedGB: 0,
          apiCallsThisMonth: 0,
          lastUpdated: new Date(),
        },
  };
}

// Format currency
export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

// Calculate savings for yearly plans
export function calculateYearlySavings(
  monthlyPrice: number,
  yearlyPrice: number
): number {
  const yearlyMonthlyEquivalent = monthlyPrice * 12;
  return yearlyMonthlyEquivalent - yearlyPrice;
}
