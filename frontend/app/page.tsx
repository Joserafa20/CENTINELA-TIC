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
        if (!cancelled) {
          setStats(s);
          setAnalyses(a);
        }
      })
      .catch(() => {/* backend not running yet — show empty state */})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview — TIC Coordination Unit</p>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Total Analyses"
          value={stats?.totals.analyses ?? 0}
          icon={Shield}
          description="All time"
          loading={isLoading}
        />
        <StatCard
          title="Emails Analyzed"
          value={stats?.totals.emails ?? 0}
          icon={Mail}
          description="All time"
          loading={isLoading}
        />
        <StatCard
          title="Files Analyzed"
          value={stats?.totals.files ?? 0}
          icon={FileSearch}
          description="All time"
          loading={isLoading}
        />
        <StatCard
          title="URLs Analyzed"
          value={stats?.totals.urls ?? 0}
          icon={Link2}
          description="All time"
          loading={isLoading}
        />
        <StatCard
          title="Domains Verified"
          value={stats?.totals.domains ?? 0}
          icon={AtSign}
          description="All time"
          loading={isLoading}
        />
        <StatCard
          title="Critical Threats"
          value={stats?.byRisk.CRITICAL ?? 0}
          icon={AlertTriangle}
          description="All time"
          variant="critical"
          loading={isLoading}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Threat Distribution</h2>
          </div>
          {stats ? (
            <ThreatChart byRisk={stats.byRisk} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Connecting to backend…
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Activity — Last 30 Days</h2>
          </div>
          {stats ? (
            <ActivityChart activityLast30Days={stats.activityLast30Days} />
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              Connecting to backend…
            </div>
          )}
        </div>
      </div>

      {/* Recent analyses */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-4">Recent Analyses</h2>
        <RecentAnalysesTable analyses={analyses?.data ?? []} />
      </div>
    </div>
  );
}
