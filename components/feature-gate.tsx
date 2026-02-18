'use client';

import type React from 'react';

import { useEffect, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Lock, Crown, Zap } from 'lucide-react';
import Link from 'next/link';
import { LoadingSpinner } from './LoadingSpinner';

interface FeatureGateProps {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showUpgrade?: boolean;
}

export function FeatureGate({
  feature,
  children,
  fallback,
  showUpgrade = true,
}: FeatureGateProps) {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkFeatureAccess();
  }, [feature]);

  const checkFeatureAccess = async () => {
    try {
      const response = await fetch(`/api/features/check?feature=${feature}`);
      if (response.ok) {
        const data = await response.json();
        setHasAccess(data.hasAccess);
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('[v0] Feature access check error:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgrade) {
    return (
      <Card className="border-dashed border-2 border-muted-foreground/25">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-2">
            <Lock className="w-6 h-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Fitur Premium</CardTitle>
          <CardDescription>
            Upgrade ke paket School untuk mengakses fitur ini
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <Button asChild className="bg-primary hover:bg-primary/90">
            <Link href="/pricing">
              <Crown className="w-4 h-4 mr-2" />
              Upgrade Sekarang
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert>
      <Lock className="h-4 w-4" />
      <AlertDescription>
        Anda tidak memiliki akses ke fitur ini. Silakan upgrade paket Anda.
      </AlertDescription>
    </Alert>
  );
}

interface UsageLimitProps {
  limitType: string;
  children: React.ReactNode;
  showWarning?: boolean;
  warningThreshold?: number;
}

export function UsageLimit({
  limitType,
  children,
  showWarning = true,
  warningThreshold = 80,
}: UsageLimitProps) {
  const [usageData, setUsageData] = useState<{
    allowed: boolean;
    current: number;
    limit: number;
    percentage: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUsageLimit();
  }, [limitType]);

  const checkUsageLimit = async () => {
    try {
      const response = await fetch(`/api/usage/check?limitType=${limitType}`);
      if (response.ok) {
        const data = await response.json();
        setUsageData(data.data);
      }
    } catch (error) {
      console.error('[v0] Usage limit check error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" />;
  }

  if (!usageData?.allowed) {
    return (
      <Alert variant="destructive">
        <Zap className="h-4 w-4" />
        <AlertDescription>
          Anda telah mencapai batas maksimum ({usageData?.current}/
          {usageData?.limit}). Silakan upgrade paket Anda.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {showWarning && usageData.percentage >= warningThreshold && (
        <Alert className="mb-4">
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Peringatan: Anda telah menggunakan{' '}
            {Math.round(usageData.percentage)}% dari batas Anda (
            {usageData.current}/{usageData.limit}).
          </AlertDescription>
        </Alert>
      )}
      {children}
    </>
  );
}
