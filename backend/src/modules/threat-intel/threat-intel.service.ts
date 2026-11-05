import { Injectable, BadRequestException } from '@nestjs/common';
import { VirusTotalClient, type VtQueryType } from './virustotal.client';
import { UrlhausClient, type UhQueryType } from './urlhaus.client';
import { ThreatIntelCacheService } from './threat-intel-cache.service';

export type IocType = 'sha256' | 'sha1' | 'md5' | 'ip' | 'domain' | 'url';

export interface ThreatIntelResponse {
  ioc: string;
  iocType: IocType;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INCONCLUSIVE';
  riskExplanation: string;
  cached: boolean;
  virustotal: unknown;
  urlhaus: unknown;
}

@Injectable()
export class ThreatIntelService {
  constructor(
    private readonly vt: VirusTotalClient,
    private readonly uh: UrlhausClient,
    private readonly cache: ThreatIntelCacheService,
  ) {}

  async lookup(ioc: string): Promise<ThreatIntelResponse> {
    const iocType = detectIocType(ioc);
    if (!iocType) {
      throw new BadRequestException(`Cannot determine IOC type for: "${ioc.slice(0, 100)}"`);
    }

    const cacheKey = `${iocType}:${ioc.toLowerCase()}`;
    const cached = await this.cache.get<ThreatIntelResponse>('lookup', cacheKey);
    if (cached) return { ...cached, cached: true };

    const [vtResult, uhResult] = await Promise.allSettled([
      this.queryVt(iocType, ioc),
      this.queryUh(iocType, ioc),
    ]);

    const vt = vtResult.status === 'fulfilled' ? vtResult.value : { error: (vtResult.reason as Error).message };
    const uh = uhResult.status === 'fulfilled' ? uhResult.value : { error: (uhResult.reason as Error).message };

    const { riskLevel, riskExplanation } = aggregateRisk(iocType, vt, uh);

    const result: ThreatIntelResponse = {
      ioc,
      iocType,
      riskLevel,
      riskExplanation,
      cached: false,
      virustotal: vt,
      urlhaus: uh,
    };

    const isMalicious = riskLevel === 'CRITICAL' || riskLevel === 'HIGH';
    await this.cache.set('lookup', cacheKey, result, isMalicious);

    return result;
  }

  private async queryVt(iocType: IocType, ioc: string) {
    const type: VtQueryType =
      iocType === 'sha256' || iocType === 'sha1' || iocType === 'md5' ? 'hash' :
      iocType === 'ip' ? 'ip' :
      iocType === 'domain' ? 'domain' : 'url';
    return this.vt.lookup(type, ioc);
  }

  private async queryUh(iocType: IocType, ioc: string) {
    const type: UhQueryType =
      iocType === 'sha256' || iocType === 'sha1' || iocType === 'md5' ? 'hash' :
      iocType === 'url' ? 'url' : 'host';
    return this.uh.lookup(type, ioc);
  }
}

// ── IOC type detection ────────────────────────────────────────────────────

function detectIocType(value: string): IocType | null {
  const v = value.trim();
  if (/^[0-9a-fA-F]{64}$/.test(v)) return 'sha256';
  if (/^[0-9a-fA-F]{40}$/.test(v)) return 'sha1';
  if (/^[0-9a-fA-F]{32}$/.test(v)) return 'md5';
  if (/^https?:\/\//i.test(v)) return 'url';
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v)) return 'ip';
  if (/^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z]{2,})+$/.test(v)) return 'domain';
  return null;
}

// ── Risk aggregation ──────────────────────────────────────────────────────

function aggregateRisk(
  iocType: IocType,
  vt: unknown,
  uh: unknown,
): { riskLevel: ThreatIntelResponse['riskLevel']; riskExplanation: string } {
  const vtData = vt as { malicious?: number; suspicious?: number; total?: number; skipped?: boolean; error?: string } | null;
  const uhData = uh as { status?: string; urlCount?: number; error?: string } | null;

  const vtMalicious = vtData?.malicious ?? 0;
  const vtSuspicious = vtData?.suspicious ?? 0;
  const vtTotal = vtData?.total ?? 0;
  const uhMalware = uhData?.status === 'malware';

  // Both sources confirm malicious → CRITICAL
  if (vtMalicious >= 3 && uhMalware) {
    return { riskLevel: 'CRITICAL', riskExplanation: `${vtMalicious}/${vtTotal} VT engines flagged as malicious. URLhaus confirms active malware distribution.` };
  }

  // VT high detections
  if (vtMalicious >= 5) {
    return { riskLevel: 'CRITICAL', riskExplanation: `${vtMalicious}/${vtTotal} VirusTotal engines detected this ${iocType} as malicious.` };
  }
  if (vtMalicious >= 1) {
    return { riskLevel: 'HIGH', riskExplanation: `${vtMalicious}/${vtTotal} VirusTotal engines flagged this ${iocType}.` };
  }

  // URLhaus only
  if (uhMalware) {
    return { riskLevel: 'HIGH', riskExplanation: `URLhaus lists this ${iocType} as a malware distribution source (${uhData?.urlCount ?? 0} known URL${(uhData?.urlCount ?? 0) !== 1 ? 's' : ''}).` };
  }

  // VT suspicious
  if (vtSuspicious >= 3) {
    return { riskLevel: 'MEDIUM', riskExplanation: `${vtSuspicious}/${vtTotal} VirusTotal engines marked as suspicious.` };
  }
  if (vtSuspicious >= 1) {
    return { riskLevel: 'MEDIUM', riskExplanation: `${vtSuspicious}/${vtTotal} VirusTotal engines reported suspicious activity.` };
  }

  // Both sources unavailable
  if ((vtData?.skipped && vtData?.error) && uhData?.status === 'error') {
    return { riskLevel: 'INCONCLUSIVE', riskExplanation: 'No threat intelligence sources were available for this lookup.' };
  }

  // No detections — LOW, never CLEAN
  const sources: string[] = [];
  if (!vtData?.skipped) sources.push(`VirusTotal (${vtTotal} engines)`);
  sources.push('URLhaus');
  return {
    riskLevel: 'LOW',
    riskExplanation: `No detections across ${sources.join(' and ')}. Classification is LOW — absence of detections does not confirm safety.`,
  };
}
