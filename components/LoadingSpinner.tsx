import * as React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({
  size = 'md',
  className,
  ...props
}: LoadingSpinnerProps) {
  const spinnerSize = {
    sm: 'h-10 w-10',
    md: 'h-16 w-16',
    lg: 'h-24 w-24',
  };

  const logoSize = {
    sm: 16,
    md: 24,
    lg: 32,
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center',
        spinnerSize[size],
        className
      )}
      {...props}
    >
      <div
        className={cn(
          'absolute h-full w-full rounded-full border-4 border-emerald-600 animate-spin',
          {
            'border-t-transparent': true, // Membuat efek putaran
          }
        )}
      />
      <Image
        src="/etahfizh_logo.svg"
        alt="Etahfizh Logo"
        width={logoSize[size]}
        height={logoSize[size]}
        className="z-10"
      />
    </div>
  );
}
