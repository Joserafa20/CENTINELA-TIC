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

const VARIANT_STYLES = {
  default: {
    iconBg: 'rgba(14,165,233,0.12)',
    iconColor: '#0ea5e9',
    valueColor: '',
    glow: '',
  },
  critical: {
    iconBg: 'rgba(239,68,68,0.12)',
    iconColor: '#ef4444',
    valueColor: '#ef4444',
    glow: '0 0 0 1px rgba(239,68,68,0.2)',
  },
  high: {
    iconBg: 'rgba(234,88,12,0.12)',
    iconColor: '#ea580c',
    valueColor: '#ea580c',
    glow: '',
  },
  medium: {
    iconBg: 'rgba(202,138,4,0.12)',
    iconColor: '#ca8a04',
    valueColor: '#ca8a04',
    glow: '',
  },
};

export function StatCard({ title, value, icon: Icon, description, variant = 'default', loading }: StatCardProps) {
  const s = VARIANT_STYLES[variant];

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden transition-shadow duration-200 hover:shadow-md"
      style={{
        background: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: s.glow || '0 1px 3px rgba(0,0,0,0.06)',
      }}
    >
      {/* Top row */}
      <div className="flex items-start justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {title}
        </p>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: s.iconBg }}
        >
          <Icon className="h-4 w-4" style={{ color: s.iconColor }} />
        </div>
      </div>

      {/* Value */}
      {loading ? (
        <div
          className="h-10 w-20 rounded-lg animate-pulse"
          style={{ background: 'var(--muted)' }}
        />
      ) : (
        <p
          className="text-4xl font-bold tabular-nums tracking-tight"
          style={{ color: s.valueColor || 'var(--foreground)' }}
        >
          {value}
        </p>
      )}

      {description && (
        <p
          className="text-xs"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {description}
        </p>
      )}
    </div>
  );
}
