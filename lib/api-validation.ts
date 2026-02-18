import { z } from 'zod';

// Common validation schemas for API endpoints
export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

export const searchSchema = z.object({
  q: z.string().min(1).max(100),
  ...paginationSchema.shape,
});

// Request validation middleware
export function validateQuery<T>(schema: z.ZodSchema<T>) {
  return (
    searchParams: URLSearchParams
  ): { success: true; data: T } | { success: false; error: string } => {
    try {
      const params: any = {};
      for (const [key, value] of searchParams.entries()) {
        params[key] = value;
      }

      const validatedData = schema.parse(params);
      return { success: true, data: validatedData };
    } catch (error: any) {
      if (error.errors) {
        return { success: false, error: error.errors[0].message };
      }
      return { success: false, error: 'Invalid query parameters' };
    }
  };
}

// File upload validation
export const fileUploadSchema = z.object({
  file: z.any().refine((file) => file instanceof File, 'File is required'),
  maxSize: z.number().default(5 * 1024 * 1024), // 5MB default
  allowedTypes: z
    .array(z.string())
    .default(['image/jpeg', 'image/png', 'image/webp']),
});

export function validateFileUpload(
  file: File,
  maxSize = 5 * 1024 * 1024,
  allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
): { success: true } | { success: false; error: string } {
  if (!file) {
    return { success: false, error: 'File is required' };
  }

  if (file.size > maxSize) {
    return {
      success: false,
      error: `File size must be less than ${Math.round(
        maxSize / 1024 / 1024
      )}MB`,
    };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      success: false,
      error: `File type must be one of: ${allowedTypes.join(', ')}`,
    };
  }

  return { success: true };
}
