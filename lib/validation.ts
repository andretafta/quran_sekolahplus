import { z } from 'zod';

// Common validation schemas
export const emailSchema = z.string().email('Email tidak valid');

export const passwordSchema = z
  .string()
  .min(8, 'Password minimal 8 karakter')
  .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
  .regex(/[a-z]/, 'Password harus mengandung huruf kecil')
  .regex(/[0-9]/, 'Password harus mengandung angka');

export const nameSchema = z
  .string()
  .min(2, 'Nama minimal 2 karakter')
  .max(100, 'Nama maksimal 100 karakter');

// Role schema (gunakan refine untuk custom error message)
export const roleSchema = z
  .enum(['saas_owner', 'admin', 'teacher', 'student'])
  .refine(
    (val) => ['saas_owner', 'admin', 'teacher', 'student'].includes(val),
    {
      message: 'Role harus saas_owner, admin, teacher, atau student',
    }
  );

// Organization type schema
export const organizationTypeSchema = z
  .enum(['individual', 'school'])
  .refine((val) => ['individual', 'school'].includes(val), {
    message: 'Tipe organisasi harus individual atau school',
  });

// Tier schema
export const tierSchema = z
  .enum(['free', 'premium'])
  .refine((val) => ['free', 'premium'].includes(val), {
    message: 'Tier harus free atau premium',
  });

// Registration validation
export const registerValidation = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: nameSchema,
  role: roleSchema,
  organizationType: organizationTypeSchema.optional(),
  organizationName: z
    .string()
    .min(2, 'Nama organisasi minimal 2 karakter')
    .optional(),
  organizationSlug: z
    .string()
    .min(2, 'Slug organisasi minimal 2 karakter')
    .optional(),
});

// Login validation
export const loginValidation = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password tidak boleh kosong'),
});

// Profile update validation
export const profileUpdateValidation = z.object({
  fullName: nameSchema.optional(),
  email: emailSchema.optional(),
  role: roleSchema.optional(),
});

// Password change validation
export const passwordChangeValidation = z
  .object({
    currentPassword: z.string().min(1, 'Password lama tidak boleh kosong'),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Konfirmasi password tidak cocok',
    path: ['confirmPassword'],
  });

// Organization validation
export const organizationValidation = z.object({
  name: z.string().min(2, 'Nama organisasi minimal 2 karakter'),
  slug: z.string().min(2, 'Slug organisasi minimal 2 karakter'),
  type: organizationTypeSchema,
  tier: tierSchema,
});

// Branch validation
export const branchValidation = z.object({
  name: z.string().min(2, 'Nama cabang minimal 2 karakter'),
  slug: z.string().min(2, 'Slug cabang minimal 2 karakter'),
  address: z.string().optional(),
  phone: z.string().optional(),
});
