const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`API error ${res.status}: ${path}`);
  }

  return res.json() as Promise<T>;
}

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'INCONCLUSIVE';
export type AnalysisType = 'EMAIL' | 'FILE' | 'URL' | 'EMAIL_VERIFY';
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface DashboardStats {
  totals: {
    analyses: number;
    emails: number;
    files: number;
    domains: number;
    urls: number;
  };
  byRisk: Record<RiskLevel, number>;
  activityLast30Days: { date: string; count: number }[];
}

export interface Analysis {
  id: string;
  type: AnalysisType;
  inputName: string | null;
  riskLevel: RiskLevel | null;
  status: AnalysisStatus;
  createdAt: string;
}

export interface AnalysesList {
  data: Analysis[];
  meta: { total: number; page: number; limit: number };
}

export const api = {
  dashboard: {
    stats: () => apiFetch<DashboardStats>('/v1/dashboard/stats'),
  },
  analyses: {
    list: (limit = 10, page = 1) =>
      apiFetch<AnalysesList>(`/v1/analyses?limit=${limit}&page=${page}`),
  },
};
