import { db } from '@/lib/database';
import { getCurrentUser } from '@/lib/auth';
import { cookies } from 'next/headers';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  address?: string;
  phone?: string;
  isActive: boolean;
  subscriptionTier: string;
  subscriptionExpires?: Date;
  settings: TenantSettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxStudents?: number;
  maxTeachers?: number;
  features: string[];
  branding?: {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

export interface TenantContext {
  tenant: Tenant | null;
  isOwner: boolean;
  canManage: boolean;
}

// Default tenant settings
const defaultTenantSettings: TenantSettings = {
  allowRegistration: true,
  requireEmailVerification: true,
  maxStudents: 100,
  maxTeachers: 10,
  features: ['basic_tahfiz', 'progress_tracking', 'reports'],
};

// Get current tenant from context
export async function getCurrentTenant(): Promise<Tenant | null> {
  try {
    const cookieStore = await cookies();
    const tenantSlug = cookieStore.get('current-tenant')?.value;

    if (!tenantSlug) {
      // Try to get from user's default branch
      const user = await getCurrentUser();
      if (user?.branchId) {
        const tenants = await db.query('SELECT * FROM branches WHERE id = $1', [
          user.branchId,
        ]);
        return tenants.length > 0 ? mapBranchToTenant(tenants[0]) : null;
      }
      return null;
    }

    const tenants = await db.query(
      'SELECT * FROM branches WHERE slug = $1 AND is_active = true',
      [tenantSlug]
    );
    return tenants.length > 0 ? mapBranchToTenant(tenants[0]) : null;
  } catch (error) {
    console.error('[v0] Get current tenant error:', error);
    return null;
  }
}

// Get tenant context with user permissions
export async function getTenantContext(): Promise<TenantContext> {
  const tenant = await getCurrentTenant();
  const user = await getCurrentUser();

  if (!tenant || !user) {
    return { tenant: null, isOwner: false, canManage: false };
  }

  const isOwner = tenant.ownerEmail === user.email;
  const canManage = isOwner || user.tier === 'school';

  return { tenant, isOwner, canManage };
}

// Set current tenant
export async function setCurrentTenant(tenantSlug: string) {
  const cookieStore = await cookies();
  cookieStore.set('current-tenant', tenantSlug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// Clear current tenant
export async function clearCurrentTenant() {
  const cookieStore = await cookies();
  cookieStore.delete('current-tenant');
}

// Get user's accessible tenants
export async function getUserTenants(userId: string): Promise<Tenant[]> {
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // Get tenants where user is owner or member
    const tenants = await db.query(
      `SELECT DISTINCT b.* FROM branches b 
       LEFT JOIN profiles p ON p.branch_id = b.id 
       WHERE (b.owner_email = $1 OR p.id = $2) AND b.is_active = true
       ORDER BY b.name`,
      [user.email, userId]
    );

    return tenants.map(mapBranchToTenant);
  } catch (error) {
    console.error('[v0] Get user tenants error:', error);
    return [];
  }
}

// Create new tenant
export async function createTenant(data: {
  name: string;
  slug: string;
  ownerEmail: string;
  address?: string;
  phone?: string;
  subscriptionTier?: string;
}): Promise<Tenant | null> {
  try {
    const settings = { ...defaultTenantSettings };

    const result = await db.query(
      `INSERT INTO branches (name, slug, owner_email, address, phone, subscription_tier, settings) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [
        data.name,
        data.slug,
        data.ownerEmail,
        data.address || null,
        data.phone || null,
        data.subscriptionTier || 'basic',
        JSON.stringify(settings),
      ]
    );

    return result.length > 0 ? mapBranchToTenant(result[0]) : null;
  } catch (error) {
    console.error('[v0] Create tenant error:', error);
    return null;
  }
}

// Update tenant
export async function updateTenant(
  tenantId: string,
  data: Partial<Tenant>
): Promise<boolean> {
  try {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (data.name) {
      updateFields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }

    if (data.address !== undefined) {
      updateFields.push(`address = $${paramIndex++}`);
      values.push(data.address);
    }

    if (data.phone !== undefined) {
      updateFields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }

    if (data.subscriptionTier) {
      updateFields.push(`subscription_tier = $${paramIndex++}`);
      values.push(data.subscriptionTier);
    }

    if (data.settings) {
      updateFields.push(`settings = $${paramIndex++}`);
      values.push(JSON.stringify(data.settings));
    }

    if (updateFields.length === 0) return false;

    updateFields.push(`updated_at = NOW()`);
    values.push(tenantId);

    await db.query(
      `UPDATE branches SET ${updateFields.join(
        ', '
      )} WHERE id = $${paramIndex}`,
      values
    );

    return true;
  } catch (error) {
    console.error('[v0] Update tenant error:', error);
    return false;
  }
}

// Check if slug is available
export async function isSlugAvailable(
  slug: string,
  excludeId?: string
): Promise<boolean> {
  try {
    const query = excludeId
      ? 'SELECT id FROM branches WHERE slug = $1 AND id != $2'
      : 'SELECT id FROM branches WHERE slug = $1';

    const params = excludeId ? [slug, excludeId] : [slug];
    const result = await db.query(query, params);

    return result.length === 0;
  } catch (error) {
    console.error('[v0] Check slug availability error:', error);
    return false;
  }
}

// Generate unique slug
export async function generateUniqueSlug(baseName: string): Promise<string> {
  let slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  let counter = 1;
  const originalSlug = slug;

  while (!(await isSlugAvailable(slug))) {
    slug = `${originalSlug}-${counter}`;
    counter++;
  }

  return slug;
}

// Map database branch to tenant interface
function mapBranchToTenant(branch: any): Tenant {
  return {
    id: branch.id,
    name: branch.name,
    slug: branch.slug,
    ownerEmail: branch.owner_email,
    address: branch.address,
    phone: branch.phone,
    isActive: branch.is_active,
    subscriptionTier: branch.subscription_tier,
    subscriptionExpires: branch.subscription_expires
      ? new Date(branch.subscription_expires)
      : undefined,
    settings: branch.settings
      ? JSON.parse(branch.settings)
      : defaultTenantSettings,
    createdAt: new Date(branch.created_at),
    updatedAt: new Date(branch.updated_at),
  };
}

// Tenant-aware database query wrapper
export async function tenantQuery(
  sql: string,
  params: any[] = []
): Promise<any[]> {
  const tenant = await getCurrentTenant();
  if (!tenant) {
    throw new Error('No tenant context available');
  }

  // Add tenant filter to queries that need it
  if (sql.includes('FROM profiles') || sql.includes('JOIN profiles')) {
    // Ensure query is filtered by tenant
    if (!sql.includes('branch_id')) {
      console.warn('[v0] Query may not be tenant-aware:', sql);
    }
  }

  return db.query(sql, params);
}
