import { Shield, Mail, FileSearch, Link2, AtSign, AlertTriangle } from "lucide-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview — TIC Coordination Unit</p>
      </div>

      {/* KPI Grid — data will come from API in FASE 2 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Analyses" value="—" icon={Shield} description="All time" />
        <StatCard title="Emails Analyzed" value="—" icon={Mail} description="All time" />
        <StatCard title="Files Analyzed" value="—" icon={FileSearch} description="All time" />
        <StatCard title="URLs Analyzed" value="—" icon={Link2} description="All time" />
        <StatCard title="Domains Verified" value="—" icon={AtSign} description="All time" />
        <StatCard title="Critical Threats" value="—" icon={AlertTriangle} description="All time" variant="destructive" />
      </div>

      <div className="rounded-lg border bg-card p-6">
        <h2 className="font-semibold mb-2">Status</h2>
        <p className="text-sm text-muted-foreground">
          FASE 1 — Infrastructure in progress. Dashboard data integration coming in FASE 2.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  variant,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  description: string;
  variant?: "destructive";
}) {
  return (
    <div className="rounded-lg border bg-card p-6 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <Icon
          className={`h-4 w-4 ${variant === "destructive" ? "text-destructive" : "text-muted-foreground"}`}
        />
      </div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
