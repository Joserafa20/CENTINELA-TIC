import { Injectable } from '@nestjs/common';
import {
  CREDENTIAL_KEYWORDS,
  URGENCY_KEYWORDS,
  IndicatorFlags,
  AuthResults,
} from './risk-engine/rules';
import { ParsedEmailData } from './email-parser.service';

export interface Indicator {
  id: string;
  type: string;
  description: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
}

function extractDomain(address: string | null): string | null {
  if (!address) return null;
  const match = address.match(/@([a-zA-Z0-9.-]+)/);
  return match ? match[1].toLowerCase() : null;
}

@Injectable()
export class IndicatorService {
  detect(data: ParsedEmailData): { indicators: Indicator[]; flags: IndicatorFlags } {
    const indicators: Indicator[] = [];
    let counter = 1;

    const id = () => `IND-${String(counter++).padStart(3, '0')}`;

    // --- Authentication failures ---
    if (data.auth.spf === 'fail') {
      indicators.push({ id: id(), type: 'SPF_FAIL', description: 'SPF check failed — sender IP not authorized by domain.', severity: 'HIGH' });
    } else if (data.auth.spf === 'softfail') {
      indicators.push({ id: id(), type: 'SPF_SOFTFAIL', description: 'SPF soft fail — sender IP not explicitly authorized.', severity: 'MEDIUM' });
    } else if (data.auth.spf === 'none') {
      indicators.push({ id: id(), type: 'SPF_NONE', description: 'No SPF record found for sender domain.', severity: 'MEDIUM' });
    }

    if (data.auth.dkim === 'fail') {
      indicators.push({ id: id(), type: 'DKIM_FAIL', description: 'DKIM signature verification failed.', severity: 'HIGH' });
    } else if (data.auth.dkim === 'none') {
      indicators.push({ id: id(), type: 'DKIM_NONE', description: 'No DKIM signature present.', severity: 'LOW' });
    }

    if (data.auth.dmarc === 'fail') {
      indicators.push({ id: id(), type: 'DMARC_FAIL', description: 'DMARC policy check failed.', severity: 'HIGH' });
    } else if (data.auth.dmarc === 'none') {
      indicators.push({ id: id(), type: 'DMARC_NONE', description: 'No DMARC policy found for sender domain.', severity: 'LOW' });
    }

    // --- Routing mismatches ---
    const fromDomain = extractDomain(data.from);
    const replyToDomain = extractDomain(data.replyTo);
    const returnPathDomain = extractDomain(data.returnPath);

    const replyToDomainMismatch = !!(replyToDomain && fromDomain && replyToDomain !== fromDomain);
    const returnPathDomainMismatch = !!(returnPathDomain && fromDomain && returnPathDomain !== fromDomain);

    if (replyToDomainMismatch) {
      indicators.push({
        id: id(),
        type: 'REPLY_TO_MISMATCH',
        description: `Reply-To domain (${replyToDomain}) differs from From domain (${fromDomain}).`,
        severity: 'MEDIUM',
      });
    }

    if (returnPathDomainMismatch) {
      indicators.push({
        id: id(),
        type: 'RETURN_PATH_MISMATCH',
        description: `Return-Path domain (${returnPathDomain}) differs from From domain (${fromDomain}).`,
        severity: 'MEDIUM',
      });
    }

    // --- Display name mismatch ---
    const displayNameMismatch = this.detectDisplayNameMismatch(data.from);
    if (displayNameMismatch) {
      indicators.push({ id: id(), type: 'DISPLAY_NAME_MISMATCH', description: 'Display name does not match the actual email address domain.', severity: 'MEDIUM' });
    }

    // --- Social engineering keywords ---
    const bodyLower = ((data.bodyText ?? '') + ' ' + (data.subject ?? '')).toLowerCase();
    const credentialRequestKeyword = CREDENTIAL_KEYWORDS.some((kw) => bodyLower.includes(kw));
    const urgencyKeyword = URGENCY_KEYWORDS.some((kw) => bodyLower.includes(kw));

    if (credentialRequestKeyword) {
      indicators.push({ id: id(), type: 'CREDENTIAL_REQUEST', description: 'Body or subject contains credential request language.', severity: 'HIGH' });
    }
    if (urgencyKeyword) {
      indicators.push({ id: id(), type: 'URGENCY_LANGUAGE', description: 'Body or subject contains urgency/social engineering language.', severity: 'MEDIUM' });
    }

    // --- Suspicious domain heuristic ---
    const suspiciousDomain = this.checkSuspiciousDomain(fromDomain, replyToDomain, returnPathDomain);
    if (suspiciousDomain) {
      indicators.push({ id: id(), type: 'SUSPICIOUS_DOMAIN', description: 'Sender or redirect domain shows typosquatting or free-provider patterns.', severity: 'HIGH' });
    }

    const flags: IndicatorFlags = {
      credentialRequestKeyword,
      urgencyKeyword,
      replyToDomainMismatch,
      returnPathDomainMismatch,
      displayNameMismatch,
      suspiciousDomain,
    };

    return { indicators, flags };
  }

  private detectDisplayNameMismatch(from: string | null): boolean {
    if (!from) return false;
    // "Company Name <actual@different.com>" where display name contains a domain
    const match = from.match(/^(.+?)\s*<([^>]+)>$/);
    if (!match) return false;
    const displayName = match[1].toLowerCase();
    const emailDomain = extractDomain(match[2]);
    if (!emailDomain) return false;
    // Check if display name looks like a different domain
    const displayDomainMatch = displayName.match(/([a-z0-9-]+\.[a-z]{2,})/);
    if (!displayDomainMatch) return false;
    return !displayDomainMatch[1].includes(emailDomain) && !emailDomain.includes(displayDomainMatch[1]);
  }

  private checkSuspiciousDomain(...domains: (string | null)[]): boolean {
    const freeDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'protonmail.com'];
    const suspiciousPatterns = [/[0-9]{3,}/, /(-{2,})/, /(paypa1|g00gle|amaz0n|micros0ft)/];
    for (const domain of domains) {
      if (!domain) continue;
      if (suspiciousPatterns.some((p) => p.test(domain))) return true;
    }
    // Not suspicious just because it's a free provider
    void freeDomains;
    return false;
  }
}
