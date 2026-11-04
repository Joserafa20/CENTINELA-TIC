'use client';

import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  variant?: 'default' | 'critical' | 'high' | 'medium';
  loading?: boolean;
}

export function StatCard({ title, value, icon: Icon, description, variant = 'default', loading }: StatCardProps) {
  const iconColor = {
    default: 'text-muted-foreground',
    critical: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
  }[variant];

  const valueColor = {
    default: '',
    critical: 'text-red-600 dark:text-red-400',
    high: 'text-orange-600 dark:text-orange-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
  }[variant];

  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon className={cn('h-4 w-4', iconColor)} />
      </div>
      {loading ? (
        <div className="h-9 w-16 animate-pulse rounded bg-muted" />
      ) : (
        <p className={cn('text-3xl font-bold tabular-nums', valueColor)}>
          {value}
        </p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
