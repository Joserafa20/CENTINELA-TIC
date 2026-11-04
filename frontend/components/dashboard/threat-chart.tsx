'use client';

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { RiskLevel, DashboardStats } from '@/lib/api';

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
  CLEAN: '#16a34a',
  INCONCLUSIVE: '#6b7280',
};

interface ThreatChartProps {
  byRisk: DashboardStats['byRisk'];
}

export function ThreatChart({ byRisk }: ThreatChartProps) {
  const data = (Object.entries(byRisk) as [RiskLevel, number][])
    .filter(([, count]) => count > 0)
    .map(([level, count]) => ({ name: level, value: count }));

  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
        No threat data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={RISK_COLORS[entry.name as RiskLevel]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [Number(value ?? 0), String(name)]}
          contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
