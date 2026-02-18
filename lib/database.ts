import { createClient } from '@supabase/supabase-js';

// Supabase client configuration with fallback
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let supabase: any = null;
let environmentError: string | null = null;

if (!supabaseUrl || !supabaseKey) {
  environmentError =
    'Missing Supabase environment variables. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to your environment variables.';
  console.error('[v0] Database initialization error:', environmentError);
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
  } catch (error) {
    environmentError = 'Failed to initialize Supabase client';
    console.error('[v0] Supabase client error:', error);
  }
}

// Helper function to check if database is available
function checkDatabaseAvailability() {
  if (environmentError || !supabase) {
    throw new Error(environmentError || 'Database not available');
  }
}

export { supabase };

// Database utility class for custom queries
export class Database {
  private static instance: Database;

  private constructor() {}

  static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  async query(sql: string, params: any[] = []): Promise<any[]> {
    checkDatabaseAvailability();

    try {
      const { data, error } = await supabase.rpc('execute_sql', {
        query: sql,
        params: params,
      });

      if (error) {
        console.error('[v0] Database query error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('[v0] Database connection error:', error);
      throw error;
    }
  }

  async findUserByEmail(email: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
      *,
      organization:organizations!profiles_organization_id_fkey(*)
    `
      )
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async createUser(userData: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: 'admin' | 'teacher' | 'student';
    organizationId?: string | null;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email: userData.email,
        password_hash: userData.passwordHash,
        full_name: userData.fullName,
        role: userData.role,
        organization_id: userData.organizationId,
        email_verified: false,
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateUserLastLogin(userId: string) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { error } = await supabase
      .from('profiles')
      .update({
        last_login: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  async createSession(sessionData: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
    deviceInfo?: any;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('sessions')
      .insert({
        user_id: sessionData.userId,
        token_hash: sessionData.tokenHash,
        expires_at: sessionData.expiresAt.toISOString(),
        ip_address: sessionData.ipAddress,
        user_agent: sessionData.userAgent,
        device_info: sessionData.deviceInfo,
        created_at: indonesianTime.toISOString(),
        last_accessed: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async findValidSession(userId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('sessions')
      .select(
        `
        *,
        user:profiles(*)
      `
      )
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async invalidateSession(userId: string) {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
  }

  async cleanupExpiredSessions() {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('sessions')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw error;
    }
  }

  async findOrganizationBySlug(slug: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async createOrganization(orgData: {
    name: string;
    type: 'individual' | 'school';
    tier: 'free' | 'premium';
    ownerId: string;
    billingEmail?: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    let subscription_status: string;
    let expired_date: string | null = null;
    let max_students: number;
    let max_teachers: number;

    // Logika untuk free trial 30 hari
    if (orgData.type === 'school' && orgData.tier !== 'premium') {
      subscription_status = 'trial';
      const expiryDate = new Date(indonesianTime);
      expiryDate.setDate(indonesianTime.getDate() + 30); // Tambahkan 30 hari
      expired_date = expiryDate.toISOString();
      max_students = 999999;
      max_teachers = 999999;
    } else {
      // Logika untuk tipe/tier lainnya
      subscription_status = 'active';
      max_students = orgData.tier === 'free' ? 10 : 999999;
      max_teachers = orgData.tier === 'free' ? 1 : 999999;
    }

    const { data, error } = await supabase
      .from('organizations')
      .insert({
        name: orgData.name,
        type: orgData.type,
        tier: orgData.tier,
        owner_id: orgData.ownerId,
        billing_email: orgData.billingEmail,
        max_students: max_students,
        max_teachers: max_teachers,
        subscription_status: subscription_status,
        expired_date: expired_date,
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async updateUserOrganization(userId: string, organizationId: string) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { error } = await supabase
      .from('profiles')
      .update({
        organization_id: organizationId,
        updated_at: indonesianTime.toISOString(),
      })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  async getAllUsersWithOrganizations() {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
        *,
        organization:organizations!profiles_organization_id_fkey(
          id,
          name,
          type,
          tier
        )
      `
      )
      .neq('email', 'app.etahfizh@gmail.com')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getAllOrganizationsWithStats() {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('organizations')
      .select(
        `
        *,
        owner:profiles!fk_organizations_owner(
          id,
          email,
          full_name
        ),
        user_count:profiles!profiles_organization_id_fkey(count)
      `
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error(
        '[v0] Database error in getAllOrganizationsWithStats:',
        error
      );
      throw error;
    }

    return data || [];
  }

  async updateUserStatus(userId: string, isActive: boolean) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user status:', error);
      // Kita bisa melemparkan error atau mengembalikan null
      return null;
    }

    return data;
  }

  async updateOrganizationStatus(orgId: string, subscriptionStatus: string) {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('organizations')
      .update({ subscription_status: subscriptionStatus })
      .eq('id', orgId);

    if (error) {
      throw error;
    }
  }

  async getUserDetailsById(userId: string) {
    checkDatabaseAvailability();

    const { data: user, error: userError } = await supabase
      .from('profiles')
      .select(
        `
      id,
      email,
      full_name,
      role,
      is_active,
      email_verified,
      created_at,
      last_login,
      organization_id,
      organization:organizations(
        id,
        name,
        type,
        tier,
        subscription_status // Pastikan Anda mengambil status ini
      )
    `
      )
      .eq('id', userId)
      .single();

    if (userError && userError.code !== 'PGRST116') {
      throw userError;
    }

    if (!user) {
      return null;
    }

    // Karena kita sudah join dengan organization di atas, tidak perlu fetch terpisah lagi.
    return {
      ...user,
      password: '••••••••', // Placeholder for security
    };
  }

  async createPasswordReset(userId: string, token: string, expiresAt: Date) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('password_resets')
      .insert({
        user_id: userId,
        token: token,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async findValidPasswordReset(token: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('password_resets')
      .select(
        `
        *,
        user:profiles(*)
      `
      )
      .eq('token', token)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async markPasswordResetAsUsed(token: string) {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('password_resets')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token);

    if (error) {
      throw error;
    }
  }

  async updateUserPassword(userId: string, passwordHash: string) {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (error) {
      throw error;
    }
  }

  async cleanupExpiredPasswordResets() {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('password_resets')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (error) {
      throw error;
    }
  }

  async createOrganizationUser(userData: {
    email: string;
    fullName: string;
    role: 'teacher' | 'student';
    organizationId: string;
    password: string;
  }) {
    checkDatabaseAvailability();

    const { hashPassword } = await import('@/lib/auth');
    const passwordHash = await hashPassword(userData.password);

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('profiles')
      .insert({
        email: userData.email,
        password_hash: passwordHash,
        full_name: userData.fullName,
        role: userData.role,
        organization_id: userData.organizationId,
        email_verified: true, // Auto-verify for admin-created accounts
        is_active: true,
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getUsersByOrganizationAndRole(
    organizationId: string,
    role: 'teacher' | 'student'
  ) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, created_at')
      .eq('organization_id', organizationId)
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getUserCountsByOrganization(organizationId: string) {
    checkDatabaseAvailability();

    const [teacherRes, studentRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'teacher'),

      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('role', 'student'),
    ]);

    if (teacherRes.error) throw teacherRes.error;
    if (studentRes.error) throw studentRes.error;

    return {
      teacher: teacherRes.count ?? 0,
      student: studentRes.count ?? 0,
    };
  }

  async getDailyUserCountsByOrganization(organizationId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('daily_user_counts')
      .select('registration_date, teachers, students')
      .eq('organization_id', organizationId)
      .order('registration_date', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async createGroup(groupData: {
    name: string;
    description?: string;
    organizationId: string;
    createdBy: string;
    teacherIds: string[];
    studentIds: string[];
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    // Create the group first
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .insert({
        name: groupData.name,
        description: groupData.description,
        organization_id: groupData.organizationId,
        created_by: groupData.createdBy,
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (groupError) {
      throw groupError;
    }

    // Add teachers to the group
    if (groupData.teacherIds.length > 0) {
      const teacherAssignments = groupData.teacherIds.map((teacherId) => ({
        group_id: group.id,
        teacher_id: teacherId,
        assigned_by: groupData.createdBy,
        assigned_at: indonesianTime.toISOString(),
      }));

      const { error: teacherError } = await supabase
        .from('group_teachers')
        .insert(teacherAssignments);

      if (teacherError) {
        throw teacherError;
      }
    }

    // Add students to the group
    if (groupData.studentIds.length > 0) {
      const studentAssignments = groupData.studentIds.map((studentId) => ({
        group_id: group.id,
        student_id: studentId,
        assigned_by: groupData.createdBy,
        joined_at: indonesianTime.toISOString(),
      }));

      const { error: studentError } = await supabase
        .from('group_students')
        .insert(studentAssignments);

      if (studentError) {
        throw studentError;
      }
    }

    return group;
  }

  async getOrganizationInfo(organizationId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('organizations')
      .select('subscription_status, expired_date, tier')
      .eq('id', organizationId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getGroupsByOrganization(organizationId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('groups')
      .select(
        `
      *,
      teachers:group_teachers(
        teacher:profiles!group_teachers_teacher_id_fkey(id, full_name, email, role)
      ),
      students:group_students(
        student:profiles!group_students_student_id_fkey(id, full_name, email, role)
      )
    `
      )
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getGroupById(groupId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('groups')
      .select(
        `
        *,
        group_teachers(
          profiles(id, full_name, email, role)
        ),
        group_students(
          profiles(id, full_name, email, role)
        )
      `
      )
      .eq('id', groupId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async updateGroupMembers(
    groupId: string,
    teacherIds: string[],
    studentIds: string[],
    updatedBy: string
  ) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    // Remove existing assignments
    await supabase.from('group_teachers').delete().eq('group_id', groupId);
    await supabase.from('group_students').delete().eq('group_id', groupId);

    // Add new teacher assignments
    if (teacherIds.length > 0) {
      const teacherAssignments = teacherIds.map((teacherId) => ({
        group_id: groupId,
        teacher_id: teacherId,
        assigned_by: updatedBy,
        assigned_at: indonesianTime.toISOString(),
      }));

      const { error: teacherError } = await supabase
        .from('group_teachers')
        .insert(teacherAssignments);

      if (teacherError) {
        throw teacherError;
      }
    }

    // Add new student assignments
    if (studentIds.length > 0) {
      const studentAssignments = studentIds.map((studentId) => ({
        group_id: groupId,
        student_id: studentId,
        assigned_by: updatedBy,
        joined_at: indonesianTime.toISOString(),
      }));

      const { error: studentError } = await supabase
        .from('group_students')
        .insert(studentAssignments);

      if (studentError) {
        throw studentError;
      }
    }

    // Update group timestamp
    await supabase
      .from('groups')
      .update({ updated_at: indonesianTime.toISOString() })
      .eq('id', groupId);
  }

  async updateGroup(
    groupId: string,
    groupName: string,
    teacherIds: string[],
    studentIds: string[],
    updatedBy: string
  ) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    // Update the group name and timestamp
    const { error: updateError } = await supabase
      .from('groups')
      .update({
        name: groupName,
        updated_at: indonesianTime.toISOString(),
      })
      .eq('id', groupId);

    if (updateError) {
      throw updateError;
    }
    await this.updateGroupMembers(groupId, teacherIds, studentIds, updatedBy);
  }

  async deleteGroup(groupId: string) {
    const { error } = await supabase.from('groups').delete().eq('id', groupId);

    if (error) {
      throw error;
    }
  }

  async createInvoice(
    organizationId: string,
    amount: number,
    durationMonths: number
  ) {
    checkDatabaseAvailability();

    // due_date = sekarang + 7 hari (misalnya invoice harus dibayar dalam seminggu)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const { data, error } = await supabase
      .from('invoices')
      .insert({
        organization_id: organizationId,
        amount,
        duration_months: durationMonths,
        due_date: dueDate.toISOString(),
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  }

  async updateInvoice(
    invoiceId: string,
    updates: { amount?: number; durationMonths?: number; status?: string }
  ) {
    checkDatabaseAvailability();

    // 1. Ambil data invoice sebelum diupdate
    const { data: currentInvoice, error: fetchError } = await supabase
      .from('invoices')
      .select(`id, status, organization_id, duration_months`)
      .eq('id', invoiceId)
      .single();

    if (fetchError) throw fetchError;

    const updatePayload: any = {};
    if (updates.amount !== undefined) updatePayload.amount = updates.amount;
    if (updates.durationMonths !== undefined)
      updatePayload.duration_months = updates.durationMonths;
    if (updates.status !== undefined) updatePayload.status = updates.status;

    // 2. Update invoice
    const { data, error } = await supabase
      .from('invoices')
      .update(updatePayload)
      .eq('id', invoiceId)
      .select(
        `
        id, amount, duration_months, status, issued_at, due_date, paid_at,
        organizations (id, name)
      `
      )
      .single();

    if (error) throw error;

    // 3. Cek apakah status berubah menjadi 'paid'
    if (currentInvoice.status !== 'paid' && updates.status === 'paid') {
      // Ambil data organisasi dan hitung tanggal kadaluarsa baru
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('expired_date')
        .eq('id', currentInvoice.organization_id)
        .single();

      if (orgError) throw orgError;

      // ✅ Gunakan kode Anda untuk mendapatkan waktu Indonesia (UTC+7)
      const now = new Date();
      const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

      let newExpiry = new Date(indonesianTime);
      if (org?.expired_date) {
        const currentExpiry = new Date(org.expired_date);
        // Pilih tanggal kadaluarsa yang lebih baru, antara yang sudah ada atau yang baru dihitung
        newExpiry =
          currentExpiry > new Date(indonesianTime)
            ? currentExpiry
            : new Date(indonesianTime);
      }

      // Tambahkan durasi dari invoice
      newExpiry.setMonth(
        newExpiry.getMonth() +
          (updates.durationMonths || currentInvoice.duration_months)
      );

      // 4. Perbarui data organisasi di database
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          expired_date: newExpiry.toISOString(),
        })
        .eq('id', currentInvoice.organization_id);
    }

    return data;
  }

  async getInvoicesByOrganization(
    organizationId: string,
    search?: string,
    statusFilter?: string
  ) {
    checkDatabaseAvailability();

    let query = supabase
      .from('invoices')
      .select(
        `id, amount, duration_months, status, issued_at, due_date, paid_at,
       organizations (id, name)`
      ) // join ke tabel organizations
      .eq('organization_id', organizationId)
      .order('issued_at', { ascending: false });

    if (search) {
      query = query.ilike('id', `%${search}%`);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  async getInvoiceById(invoiceId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('invoices')
      .select(
        `id, amount, duration_months, status, issued_at, due_date, paid_at,
       organization_id,
       organizations (id, name, type, billing_email)`
      )
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  }

  async getInvoicesWithOrgData(
    organizationId: string,
    search?: string,
    statusFilter?: string
  ) {
    checkDatabaseAvailability();

    let query = supabase
      .from('invoices')
      .select(
        `id, amount, duration_months, status, issued_at, due_date, paid_at,
       organization_id,
       organizations (id, name, tier, address)`
      )
      .eq('organization_id', organizationId)
      .order('issued_at', { ascending: false });

    if (search) {
      query = query.ilike('id', `%${search}%`);
    }
    if (statusFilter) {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data || [];
  }

  async markInvoiceAsPaid(invoiceId: string) {
    checkDatabaseAvailability();

    const { data: invoice, error } = await supabase
      .from('invoices')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', invoiceId)
      .select('organization_id, duration_months')
      .single();

    if (error) throw error;

    // Update organization subscription
    if (invoice?.organization_id) {
      const { data: org } = await supabase
        .from('organizations')
        .select('expired_date')
        .eq('id', invoice.organization_id)
        .single();

      let newExpiry = new Date();
      if (org?.expired_date) {
        const currentExpiry = new Date(org.expired_date);
        newExpiry = currentExpiry > new Date() ? currentExpiry : new Date();
      }

      newExpiry.setMonth(newExpiry.getMonth() + invoice.duration_months);

      await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          expired_date: newExpiry.toISOString(),
        })
        .eq('id', invoice.organization_id);
    }

    return invoice;
  }

  async checkAndSuspendExpiredSubscriptions() {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('organizations')
      .update({ subscription_status: 'suspended' })
      .lt('expired_date', now)
      .eq('subscription_status', 'active');

    if (error) throw error;
    return data;
  }

  async createAchievementBadge(badgeData: {
    name: string;
    description?: string;
    badgeImageUrl: string;
    organizationId: string;
    createdBy: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('achievement_badges')
      .insert({
        name: badgeData.name,
        description: badgeData.description,
        badge_image_url: badgeData.badgeImageUrl,
        organization_id: badgeData.organizationId,
        created_by: badgeData.createdBy,
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getAchievementBadgesByOrganization(organizationId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('achievement_badges')
      .select(
        `
        *,
        creator:profiles!achievement_badges_created_by_fkey(id, full_name, email)
      `
      )
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  }

  async updateAchievementBadge(
    badgeId: string,
    updates: {
      name?: string;
      description?: string;
      badgeImageUrl?: string;
    }
  ) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const updateData: any = {
      updated_at: indonesianTime.toISOString(),
    };

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined)
      updateData.description = updates.description;
    if (updates.badgeImageUrl !== undefined)
      updateData.badge_image_url = updates.badgeImageUrl;

    const { data, error } = await supabase
      .from('achievement_badges')
      .update(updateData)
      .eq('id', badgeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async deleteAchievementBadge(badgeId: string) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('achievement_badges')
      .update({
        is_active: false,
        updated_at: indonesianTime.toISOString(),
      })
      .eq('id', badgeId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getAchievementBadgeById(badgeId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('achievement_badges')
      .select(
        `
        *,
        creator:profiles!achievement_badges_created_by_fkey(id, full_name, email)
      `
      )
      .eq('id', badgeId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  // Teacher Group and Student Management
  async getTeacherGroups(teacherId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('group_teachers')
      .select(
        `
        group:groups(
          *,
          students:group_students(
            student:profiles!group_students_student_id_fkey(id, full_name, email, role)
          )
        )
      `
      )
      .eq('teacher_id', teacherId);

    if (error) {
      throw error;
    }

    return data?.map((item: { group: any }) => item.group) || [];
  }

  async getStudentsByTeacher(teacherId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('group_teachers')
      .select(
        `
        group:groups(
          id,
          name,
          students:group_students(
            student:profiles!group_students_student_id_fkey(id, full_name, email, role, created_at)
          )
        )
      `
      )
      .eq('teacher_id', teacherId);

    if (error) {
      throw error;
    }

    // Flatten the students from all groups
    const students =
      data?.flatMap(
        (item: { group: { students: any[]; id: any; name: any } }) =>
          item.group?.students?.map((s) => ({
            ...s.student,
            group_id: item.group?.id,
            group_name: item.group?.name,
          })) || []
      ) || [];

    return students;
  }

  // Tahfizh Journal Methods
  async createTahfizhJournal(journalData: {
    studentId: string;
    teacherId: string;
    groupId: string;
    organizationId: string;
    surahName: string;
    ayahStart: number;
    ayahEnd: number;
    memorizationQuality: 'excellent' | 'good' | 'fair' | 'needs_improvement';
    notes?: string;
    dateRecorded?: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('tahfizh_journals')
      .insert({
        student_id: journalData.studentId,
        teacher_id: journalData.teacherId,
        group_id: journalData.groupId,
        organization_id: journalData.organizationId,
        surah_name: journalData.surahName,
        ayah_start: journalData.ayahStart,
        ayah_end: journalData.ayahEnd,
        memorization_quality: journalData.memorizationQuality,
        notes: journalData.notes,
        date_recorded:
          journalData.dateRecorded ||
          indonesianTime.toISOString().split('T')[0],
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getTahfizhJournalsByTeacher(teacherId: string, studentId?: string) {
    checkDatabaseAvailability();

    let query = supabase
      .from('tahfizh_journals')
      .select(
        `
        *,
        student:profiles!tahfizh_journals_student_id_fkey(id, full_name, email),
        group:groups!tahfizh_journals_group_id_fkey(id, name)
      `
      )
      .eq('teacher_id', teacherId)
      .order('date_recorded', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Tahsin Journal Methods
  async createTahsinJournal(journalData: {
    studentId: string;
    teacherId: string;
    groupId: string;
    organizationId: string;
    surahName: string;
    ayahStart: number;
    ayahEnd: number;
    tajweedScore: number;
    fluencyScore: number;
    pronunciationScore: number;
    overallScore: number;
    notes?: string;
    dateRecorded?: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('tahsin_journals')
      .insert({
        student_id: journalData.studentId,
        teacher_id: journalData.teacherId,
        group_id: journalData.groupId,
        organization_id: journalData.organizationId,
        surah_name: journalData.surahName,
        ayah_start: journalData.ayahStart,
        ayah_end: journalData.ayahEnd,
        tajweed_score: journalData.tajweedScore,
        fluency_score: journalData.fluencyScore,
        pronunciation_score: journalData.pronunciationScore,
        overall_score: journalData.overallScore,
        notes: journalData.notes,
        date_recorded:
          journalData.dateRecorded ||
          indonesianTime.toISOString().split('T')[0],
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getTahsinJournalsByTeacher(teacherId: string, studentId?: string) {
    checkDatabaseAvailability();

    let query = supabase
      .from('tahsin_journals')
      .select(
        `
        *,
        student:profiles!tahsin_journals_student_id_fkey(id, full_name, email),
        group:groups!tahsin_journals_group_id_fkey(id, name)
      `
      )
      .eq('teacher_id', teacherId)
      .order('date_recorded', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Assessment Methods
  async createAssessment(assessmentData: {
    studentId: string;
    teacherId: string;
    groupId: string;
    organizationId: string;
    assessmentType: string;
    subject: string;
    title: string;
    description?: string;
    score: number;
    maxScore: number;
    grade?: string;
    dateAssessed?: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        student_id: assessmentData.studentId,
        teacher_id: assessmentData.teacherId,
        group_id: assessmentData.groupId,
        organization_id: assessmentData.organizationId,
        assessment_type: assessmentData.assessmentType,
        subject: assessmentData.subject,
        title: assessmentData.title,
        description: assessmentData.description,
        score: assessmentData.score,
        max_score: assessmentData.maxScore,
        grade: assessmentData.grade,
        date_assessed:
          assessmentData.dateAssessed ||
          indonesianTime.toISOString().split('T')[0],
        created_at: indonesianTime.toISOString(),
        updated_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getAssessmentsByTeacher(teacherId: string, studentId?: string) {
    checkDatabaseAvailability();

    let query = supabase
      .from('assessments')
      .select(
        `
        *,
        student:profiles!assessments_student_id_fkey(id, full_name, email),
        group:groups!assessments_group_id_fkey(id, name)
      `
      )
      .eq('teacher_id', teacherId)
      .order('date_assessed', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  // Student Badge Methods
  async awardBadgeToStudent(badgeData: {
    studentId: string;
    teacherId: string;
    badgeId: string;
    groupId: string;
    organizationId: string;
    reason?: string;
  }) {
    checkDatabaseAvailability();

    const now = new Date();
    const indonesianTime = new Date(now.getTime() + 7 * 60 * 60 * 1000); // UTC+7

    const { data, error } = await supabase
      .from('student_badges')
      .insert({
        student_id: badgeData.studentId,
        teacher_id: badgeData.teacherId,
        badge_id: badgeData.badgeId,
        group_id: badgeData.groupId,
        organization_id: badgeData.organizationId,
        reason: badgeData.reason,
        date_awarded: indonesianTime.toISOString().split('T')[0],
        created_at: indonesianTime.toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  async getStudentBadgesByTeacher(teacherId: string, studentId?: string) {
    checkDatabaseAvailability();

    let query = supabase
      .from('student_badges')
      .select(
        `
        *,
        student:profiles!student_badges_student_id_fkey(id, full_name, email),
        badge:achievement_badges!student_badges_badge_id_fkey(id, name, description, badge_image_url),
        group:groups!student_badges_group_id_fkey(id, name)
      `
      )
      .eq('teacher_id', teacherId)
      .order('date_awarded', { ascending: false });

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async removeStudentBadge(studentBadgeId: string) {
    checkDatabaseAvailability();

    const { error } = await supabase
      .from('student_badges')
      .delete()
      .eq('id', studentBadgeId);

    if (error) {
      throw error;
    }
  }

  // Student-specific database functions for student dashboard
  async getStudentById(studentId: string) {
    checkDatabaseAvailability();

    const { data, error } = await supabase
      .from('profiles')
      .select(
        `
    id,
    email,
    full_name,
    role,
    is_active,
    created_at,
    organization_id,
    organization:organizations!profiles_organization_id_fkey(
      id,
      name,
      type,
      tier
    ),
    student_groups:group_students!group_students_student_id_fkey(
      group:groups(
        id,
        name,
        description,
        teachers:group_teachers(
          teacher:profiles!group_teachers_teacher_id_fkey(id, full_name, email)
        )
      )
    )
  `
      )
      .eq('id', studentId)
      .eq('role', 'student')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data;
  }

  async getTahfizhProgressByStudent(studentId: string, limit?: number) {
    checkDatabaseAvailability();

    let query = supabase
      .from('tahfizh_journals')
      .select(
        `
        *,
        teacher:profiles!tahfizh_journals_teacher_id_fkey(id, full_name),
        group:groups!tahfizh_journals_group_id_fkey(id, name)
      `
      )
      .eq('student_id', studentId)
      .order('date_recorded', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getTahsinProgressByStudent(studentId: string, limit?: number) {
    checkDatabaseAvailability();

    let query = supabase
      .from('tahsin_journals')
      .select(
        `
        *,
        teacher:profiles!tahsin_journals_teacher_id_fkey(id, full_name),
        group:groups!tahsin_journals_group_id_fkey(id, name)
      `
      )
      .eq('student_id', studentId)
      .order('date_recorded', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getStudentBadges(studentId: string, limit?: number) {
    checkDatabaseAvailability();

    let query = supabase
      .from('student_badges')
      .select(
        `
        *,
        badge:achievement_badges!student_badges_badge_id_fkey(
          id,
          name,
          description,
          badge_image_url
        ),
        teacher:profiles!student_badges_teacher_id_fkey(id, full_name),
        group:groups!student_badges_group_id_fkey(id, name)
      `
      )
      .eq('student_id', studentId)
      .order('date_awarded', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getStudentAssessments(studentId: string, limit?: number) {
    checkDatabaseAvailability();

    let query = supabase
      .from('assessments')
      .select(
        `
        *,
        teacher:profiles!assessments_teacher_id_fkey(id, full_name),
        group:groups!assessments_group_id_fkey(id, name)
      `
      )
      .eq('student_id', studentId)
      .order('date_assessed', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  }

  async getStudentJournals(studentId: string, limit?: number) {
    checkDatabaseAvailability();

    const [tahfizhData, tahsinData] = await Promise.all([
      this.getTahfizhProgressByStudent(studentId, limit),
      this.getTahsinProgressByStudent(studentId, limit),
    ]);

    // Combine and sort by date
    const combined = [
      ...tahfizhData.map((item: any) => ({ ...item, type: 'tahfizh' })),
      ...tahsinData.map((item: any) => ({ ...item, type: 'tahsin' })),
    ].sort(
      (a, b) =>
        new Date(b.date_recorded).getTime() -
        new Date(a.date_recorded).getTime()
    );

    return limit ? combined.slice(0, limit) : combined;
  }

  async getStudentProgressStats(studentId: string) {
    checkDatabaseAvailability();

    const [tahfizhCount, tahsinCount, badgeCount, assessmentCount] =
      await Promise.all([
        supabase
          .from('tahfizh_journals')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId),

        supabase
          .from('tahsin_journals')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId),

        supabase
          .from('student_badges')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId),

        supabase
          .from('assessments')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId),
      ]);

    // Get average scores
    const { data: avgScores } = await supabase
      .from('assessments')
      .select('score, max_score')
      .eq('student_id', studentId);

    let averageScore = 0;
    if (avgScores && avgScores.length > 0) {
      const totalPercentage = avgScores.reduce(
        (sum: number, assessment: { score: number; max_score: number }) => {
          return sum + (assessment.score / assessment.max_score) * 100;
        },
        0
      );
      averageScore = totalPercentage / avgScores.length;
    }

    return {
      tahfizhEntries: tahfizhCount.count || 0,
      tahsinEntries: tahsinCount.count || 0,
      badgesEarned: badgeCount.count || 0,
      assessmentsCompleted: assessmentCount.count || 0,
      averageScore: Math.round(averageScore),
    };
  }
}

export const db = Database.getInstance();
