'use client';

import { useEffect, useState } from 'react';
import { Shield, Mail, FileSearch, Link2, AtSign, AlertTriangle, TrendingUp, Activity } from 'lucide-react';
import { api, type DashboardStats, type AnalysesList } from '@/lib/api';
import { StatCard } from '@/components/dashboard/stat-card';
import { ThreatChart } from '@/components/dashboard/threat-chart';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { RecentAnalysesTable } from '@/components/dashboard/recent-analyses-table';

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analyses, setAnalyses] = useState<AnalysesList | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([api.dashboard.stats(), api.analyses.list(10, 1)])
      .then(([s, a]) => {
        if (!cancelled) { setStats(s); setAnalyses(a); }
      })
      .catch(() => {/* backend not running yet — show empty state */})
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-7">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Dashboard
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
            Platform overview — TIC Coordination Unit
          </p>
        </div>
        <div
          className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full"
          style={{
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            color: '#22c55e',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          All systems operational
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Analyses"   value={stats?.totals.analyses ?? 0} icon={Shield}        description="All time"  loading={isLoading} />
        <StatCard title="Emails Analyzed"  value={stats?.totals.emails ?? 0}   icon={Mail}          description="All time"  loading={isLoading} />
        <StatCard title="Files Analyzed"   value={stats?.totals.files ?? 0}    icon={FileSearch}    description="All time"  loading={isLoading} />
        <StatCard title="URLs Analyzed"    value={stats?.totals.urls ?? 0}     icon={Link2}         description="All time"  loading={isLoading} />
        <StatCard title="Domains Verified" value={stats?.totals.domains ?? 0}  icon={AtSign}        description="All time"  loading={isLoading} />
        <StatCard title="Critical Threats" value={stats?.byRisk.CRITICAL ?? 0} icon={AlertTriangle} description="All time"  loading={isLoading} variant="critical" />
      </div>

      {/* Charts row */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Threat Distribution
            </h2>
          </div>
          {stats ? (
            <ThreatChart byRisk={stats.byRisk} />
          ) : (
            <div
              className="flex h-48 items-center justify-center text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {isLoading ? 'Loading…' : 'No data yet'}
            </div>
          )}
        </div>

        <div
          className="rounded-xl p-6"
          style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Activity className="h-4 w-4" style={{ color: 'var(--primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
              Activity — Last 30 Days
            </h2>
          </div>
          {stats ? (
            <ActivityChart activityLast30Days={stats.activityLast30Days} />
          ) : (
            <div
              className="flex h-48 items-center justify-center text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {isLoading ? 'Loading…' : 'No data yet'}
            </div>
          )}
        </div>
      </div>

      {/* Recent analyses */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'var(--card)', border: '1px solid var(--border)' }}
      >
        <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--foreground)' }}>
          Recent Analyses
        </h2>
        <RecentAnalysesTable analyses={analyses?.data ?? []} />
      </div>
    </div>
  );
}
