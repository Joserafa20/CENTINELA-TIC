import { Injectable, Logger } from '@nestjs/common';
import { simpleParser, ParsedMail, Attachment } from 'mailparser';
import * as crypto from 'crypto';
import { SpfResult, DkimResult, DmarcResult, AuthResults } from './risk-engine/rules';

export interface ParsedAttachment {
  filename: string | null;
  mimeType: string;
  size: number;
  sha256: string;
}

export interface ParsedEmailData {
  from: string | null;
  to: string | null;
  cc: string | null;
  replyTo: string | null;
  returnPath: string | null;
  subject: string | null;
  date: string | null;
  messageId: string | null;
  rawHeaders: Record<string, string>;
  auth: AuthResults;
  urls: string[];
  attachments: ParsedAttachment[];
  bodyText: string | null;
  bodyHtml: string | null;
}

@Injectable()
export class EmailParserService {
  private readonly logger = new Logger(EmailParserService.name);

  async parse(buffer: Buffer): Promise<ParsedEmailData | null> {
    try {
      const mail = await simpleParser(buffer, { skipHtmlToText: false });
      return this.extract(mail);
    } catch (err) {
      this.logger.warn(`Email parse failed: ${(err as Error).message}`);
      return null;
    }
  }

  private extract(mail: ParsedMail): ParsedEmailData {
    const rawHeaders: Record<string, string> = {};
    mail.headers.forEach((value, key) => {
      rawHeaders[key] = Array.isArray(value) ? value.join('; ') : String(value);
    });

    return {
      from: mail.from?.text ?? null,
      to: mail.to ? (Array.isArray(mail.to) ? mail.to.map((a) => a.text).join(', ') : mail.to.text) : null,
      cc: mail.cc ? (Array.isArray(mail.cc) ? mail.cc.map((a) => a.text).join(', ') : mail.cc.text) : null,
      replyTo: mail.replyTo?.text ?? null,
      returnPath: rawHeaders['return-path'] ?? null,
      subject: mail.subject ?? null,
      date: mail.date?.toISOString() ?? null,
      messageId: mail.messageId ?? null,
      rawHeaders,
      auth: this.extractAuth(rawHeaders),
      urls: this.extractUrls(mail.text ?? '', typeof mail.html === 'string' ? mail.html : ''),
      attachments: this.extractAttachments(mail.attachments ?? []),
      bodyText: mail.text ?? null,
      bodyHtml: mail.html ? mail.html : null,
    };
  }

  private extractAuth(headers: Record<string, string>): AuthResults {
    return {
      spf: this.parseSpf(headers),
      dkim: this.parseDkim(headers),
      dmarc: this.parseDmarc(headers),
    };
  }

  private parseSpf(headers: Record<string, string>): SpfResult {
    const sources = [
      headers['received-spf'],
      headers['authentication-results'],
    ].filter(Boolean).join(' ').toLowerCase();

    if (!sources) return 'none';
    if (sources.includes('spf=pass')) return 'pass';
    if (sources.includes('spf=fail')) return 'fail';
    if (sources.includes('spf=softfail')) return 'softfail';
    if (sources.includes('spf=neutral')) return 'neutral';
    if (sources.includes('spf=permerror')) return 'permerror';
    if (sources.includes('spf=temperror')) return 'temperror';
    if (sources.includes('fail')) return 'fail';
    return 'none';
  }

  private parseDkim(headers: Record<string, string>): DkimResult {
    const authResults = (headers['authentication-results'] ?? '').toLowerCase();
    const dkimSig = headers['dkim-signature'];

    if (!authResults && !dkimSig) return 'none';
    if (!dkimSig) return 'none';

    if (authResults.includes('dkim=pass')) return 'pass';
    if (authResults.includes('dkim=fail')) return 'fail';
    if (authResults.includes('dkim=')) return 'fail';

    // Has DKIM-Signature but no authentication-results — treat as unverified
    return 'none';
  }

  private parseDmarc(headers: Record<string, string>): DmarcResult {
    const authResults = (headers['authentication-results'] ?? '').toLowerCase();
    if (!authResults) return 'none';
    if (authResults.includes('dmarc=pass')) return 'pass';
    if (authResults.includes('dmarc=fail')) return 'fail';
    return 'none';
  }

  private extractUrls(text: string, html: string): string[] {
    const urlPattern = /https?:\/\/[^\s"'<>)\]]+/gi;
    const fromText = text.match(urlPattern) ?? [];
    const fromHtml = html.match(urlPattern) ?? [];
    return [...new Set([...fromText, ...fromHtml])].slice(0, 100);
  }

  private extractAttachments(attachments: Attachment[]): ParsedAttachment[] {
    return attachments.map((att) => ({
      filename: att.filename ?? null,
      mimeType: att.contentType ?? 'application/octet-stream',
      size: att.size ?? att.content.length,
      sha256: crypto.createHash('sha256').update(att.content).digest('hex'),
    }));
  }
}
