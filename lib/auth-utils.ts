'use client';

// Client-side auth utilities

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // For client-side, we can't access httpOnly cookies directly
  // The token will be managed by the server via cookies
  return null;
}

export function isAuthenticated(): boolean {
  // This will be determined by the AuthProvider context
  return false;
}

// Password strength checker
export function checkPasswordStrength(password: string): {
  score: number;
  feedback: string[];
} {
  const feedback: string[] = [];
  let score = 0;

  if (password.length >= 8) {
    score += 1;
  } else {
    feedback.push('Password minimal 8 karakter');
  }

  if (/[A-Z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Tambahkan huruf besar');
  }

  if (/[a-z]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Tambahkan huruf kecil');
  }

  if (/[0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Tambahkan angka');
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
    feedback.push('Password sangat kuat!');
  } else {
    feedback.push('Tambahkan karakter khusus untuk keamanan ekstra');
  }

  return { score, feedback };
}

// Email validation
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Format user display name
export function formatUserName(user: {
  fullName: string;
  email: string;
}): string {
  return user.fullName || user.email.split('@')[0];
}

// Get user initials for avatar
export function getUserInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map((name) => name.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Check if user has specific tier
export function hasRequiredTier(
  userTier: string,
  requiredTier: string | string[]
): boolean {
  if (Array.isArray(requiredTier)) {
    return requiredTier.includes(userTier);
  }
  return userTier === requiredTier;
}
