'use client';

import {
  flexRender,
  createCoreRowModel,
  useTable,
  tableFeatures,
  coreFeatures,
} from '@tanstack/react-table';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyColumnDef = any;
import type { Analysis, RiskLevel } from '@/lib/api';
import { Badge } from '@/components/ui/badge';

const _features = tableFeatures(coreFeatures);

const RISK_BADGE_VARIANT: Record<RiskLevel, 'critical' | 'high' | 'medium' | 'low' | 'clean' | 'inconclusive'> = {
  CRITICAL: 'critical',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
  CLEAN: 'clean',
  INCONCLUSIVE: 'inconclusive',
};

const TYPE_LABEL: Record<string, string> = {
  EMAIL: 'Email',
  FILE: 'File',
  URL: 'URL',
  EMAIL_VERIFY: 'Domain',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const columns: AnyColumnDef[] = [
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ getValue }: { getValue: () => string }) => formatDate(getValue()),
  },
  {
    accessorKey: 'type',
    header: 'Type',
    cell: ({ getValue }: { getValue: () => string }) => TYPE_LABEL[getValue()] ?? getValue(),
  },
  {
    accessorKey: 'inputName',
    header: 'Input',
    cell: ({ getValue }: { getValue: () => string | null }) => {
      const v = getValue();
      return <span className="max-w-[200px] truncate block" title={v ?? undefined}>{v ?? '—'}</span>;
    },
  },
  {
    accessorKey: 'riskLevel',
    header: 'Risk',
    cell: ({ getValue }: { getValue: () => RiskLevel | null }) => {
      const level = getValue();
      if (!level) return <span className="text-muted-foreground">—</span>;
      return <Badge variant={RISK_BADGE_VARIANT[level]}>{level}</Badge>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ getValue }: { getValue: () => string }) => (
      <span className="text-xs capitalize text-muted-foreground">
        {getValue().toLowerCase()}
      </span>
    ),
  },
];

interface RecentAnalysesTableProps {
  analyses: Analysis[];
}

export function RecentAnalysesTable({ analyses }: RecentAnalysesTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useTable({
    features: _features,
    rowModels: { Core: createCoreRowModel() },
    data: analyses,
    columns,
  } as any);

  if (analyses.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
        No analyses yet — start by submitting an email, file, or URL.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="pb-2 pr-4 text-left text-xs font-medium text-muted-foreground"
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="py-2 pr-4 align-middle">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
