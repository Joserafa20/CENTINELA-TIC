'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { DashboardStats } from '@/lib/api';

interface ActivityChartProps {
  activityLast30Days: DashboardStats['activityLast30Days'];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

export function ActivityChart({ activityLast30Days }: ActivityChartProps) {
  if (activityLast30Days.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No activity in the last 30 days
      </div>
    );
  }

  const data = activityLast30Days.map((d) => ({
    date: formatDate(d.date),
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(value) => [Number(value ?? 0), 'Analyses']}
        />
        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
