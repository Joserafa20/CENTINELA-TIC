import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DnsService } from './dns.service';
import { classifyVerifyRisk } from './email-verify-risk.engine';

function validateEmailSyntax(email: string): { valid: boolean; reason?: string } {
  // RFC 5321-compliant basic check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  if (!re.test(email)) return { valid: false, reason: 'Email address does not match expected format (local@domain.tld)' };
  if (email.length > 254) return { valid: false, reason: 'Email address exceeds 254 characters (RFC 5321)' };
  const [local] = email.split('@');
  if (local.length > 64) return { valid: false, reason: 'Local part exceeds 64 characters (RFC 5321)' };
  return { valid: true };
}

@Injectable()
export class EmailVerifyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dns: DnsService,
  ) {}

  async verify(email: string): Promise<{ analysisId: string; status: string }> {
    const syntax = validateEmailSyntax(email);
    const domain = email.split('@')[1]?.toLowerCase() ?? '';

    const analysis = await this.prisma.analysis.create({
      data: {
        type: 'EMAIL_VERIFY',
        status: 'PROCESSING',
        inputName: email,
        emailVerify: {
          create: {
            email,
            syntaxResult: syntax as object,
          },
        },
      },
    });

    // Run async — don't block HTTP response
    this.runVerification(analysis.id, email, domain, syntax.valid).catch((err) => {
      void this.prisma.analysis.update({
        where: { id: analysis.id },
        data: { status: 'FAILED', riskLevel: 'INCONCLUSIVE', riskExplanation: String(err.message) },
      });
    });

    return { analysisId: analysis.id, status: 'PROCESSING' };
  }

  private async runVerification(
    analysisId: string,
    email: string,
    domain: string,
    syntaxValid: boolean,
  ) {
    if (!syntaxValid) {
      await this.prisma.analysis.update({
        where: { id: analysisId },
        data: {
          status: 'COMPLETED',
          riskLevel: 'HIGH',
          riskExplanation: 'Email address syntax is invalid.',
          completedAt: new Date(),
        },
      });
      return;
    }

    const dnsResult = await this.dns.lookup(domain);
    const risk = classifyVerifyRisk(dnsResult);

    const authSummary = {
      spf: dnsResult.spfRecord
        ? { present: true, record: dnsResult.spfRecord, strength: spfStrength(dnsResult.spfRecord) }
        : { present: false },
      dmarc: dnsResult.dmarcRecord
        ? { present: true, record: dnsResult.dmarcRecord, policy: extractPolicy(dnsResult.dmarcRecord) }
        : { present: false },
      dkim: dnsResult.dkimRecords.length > 0
        ? { present: true, selectors: dnsResult.dkimRecords }
        : { present: false },
    };

    const domainSummary = {
      domain,
      exists: dnsResult.domainExists,
      mxRecords: dnsResult.mxRecords,
    };

    await this.prisma.analysis.update({
      where: { id: analysisId },
      data: {
        status: 'COMPLETED',
        riskLevel: risk.level as never,
        riskExplanation: risk.explanation,
        completedAt: new Date(),
        emailVerify: {
          update: {
            domainResult: domainSummary as object,
            authentication: authSummary as object,
          },
        },
      },
    });
  }

  async findById(id: string) {
    const analysis = await this.prisma.analysis.findUnique({
      where: { id },
      include: { emailVerify: true },
    });

    if (!analysis || analysis.type !== 'EMAIL_VERIFY') {
      throw new NotFoundException(`Email verification ${id} not found`);
    }

    const ev = analysis.emailVerify;
    return {
      id: analysis.id,
      status: analysis.status,
      riskLevel: analysis.riskLevel,
      riskExplanation: analysis.riskExplanation,
      createdAt: analysis.createdAt,
      completedAt: analysis.completedAt,
      email: ev?.email ?? null,
      syntax: ev?.syntaxResult ?? null,
      domain: ev?.domainResult ?? null,
      authentication: ev?.authentication ?? null,
    };
  }
}

function spfStrength(spf: string): string {
  if (spf.includes('-all')) return 'hard_fail';
  if (spf.includes('~all')) return 'soft_fail';
  if (spf.includes('?all')) return 'neutral';
  return 'pass';
}

function extractPolicy(dmarc: string): string {
  const m = dmarc.match(/p=(\w+)/i);
  return m ? m[1].toLowerCase() : 'none';
}
