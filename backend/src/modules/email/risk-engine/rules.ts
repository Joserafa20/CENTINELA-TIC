/**
 * Risk classification rules for email analysis.
 * FR-EMAIL-010, FR-EMAIL-011: Absence of detection ≠ CLEAN.
 * These rules are evaluated in order; first match wins.
 */

export type SpfResult = 'pass' | 'fail' | 'softfail' | 'neutral' | 'none' | 'permerror' | 'temperror';
export type DkimResult = 'pass' | 'fail' | 'none' | 'syntax_error';
export type DmarcResult = 'pass' | 'fail' | 'none';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN' | 'INCONCLUSIVE';

export interface AuthResults {
  spf: SpfResult;
  dkim: DkimResult;
  dmarc: DmarcResult;
}

export interface IndicatorFlags {
  credentialRequestKeyword: boolean;
  urgencyKeyword: boolean;
  replyToDomainMismatch: boolean;
  returnPathDomainMismatch: boolean;
  displayNameMismatch: boolean;
  suspiciousDomain: boolean;
}

export interface RiskResult {
  level: RiskLevel;
  explanation: string;
}

const AUTH_FAIL = (auth: AuthResults): boolean =>
  auth.spf === 'fail' || auth.spf === 'softfail' || auth.dkim === 'fail' || auth.dmarc === 'fail';

const AUTH_NONE = (auth: AuthResults): boolean =>
  auth.spf === 'none' && auth.dkim === 'none' && auth.dmarc === 'none';

const AUTH_PASS = (auth: AuthResults): boolean =>
  auth.spf === 'pass' && auth.dkim === 'pass' && auth.dmarc === 'pass';

export function classifyEmailRisk(auth: AuthResults, flags: IndicatorFlags): RiskResult {
  // Rule 1: AUTH FAIL + credential request → CRITICAL
  if (AUTH_FAIL(auth) && flags.credentialRequestKeyword) {
    return {
      level: 'CRITICAL',
      explanation: `Authentication failed (SPF: ${auth.spf.toUpperCase()}, DKIM: ${auth.dkim.toUpperCase()}) combined with credential request language detected.`,
    };
  }

  // Rule 2: AUTH FAIL + Reply-To/Return-Path mismatch + suspicious domain → HIGH
  if (AUTH_FAIL(auth) && (flags.replyToDomainMismatch || flags.returnPathDomainMismatch) && flags.suspiciousDomain) {
    return {
      level: 'HIGH',
      explanation: `Authentication failed and envelope routing indicates spoofing: Reply-To or Return-Path domain differs from From domain.`,
    };
  }

  // Rule 3: AUTH FAIL + urgency keywords → HIGH
  if (AUTH_FAIL(auth) && flags.urgencyKeyword) {
    return {
      level: 'HIGH',
      explanation: `Authentication failed (SPF: ${auth.spf.toUpperCase()}) combined with urgency/social engineering language.`,
    };
  }

  // Rule 4: AUTH FAIL alone → MEDIUM
  if (AUTH_FAIL(auth)) {
    return {
      level: 'MEDIUM',
      explanation: `Authentication check failed: SPF ${auth.spf.toUpperCase()}, DKIM ${auth.dkim.toUpperCase()}, DMARC ${auth.dmarc.toUpperCase()}. No additional high-severity indicators detected.`,
    };
  }

  // Rule 5: AUTH NONE → MEDIUM (unauthenticated)
  if (AUTH_NONE(auth)) {
    return {
      level: 'MEDIUM',
      explanation: `No email authentication records found (SPF/DKIM/DMARC all absent). Cannot verify sender legitimacy.`,
    };
  }

  // Rule 6: All auth PASS + Reply-To mismatch → MEDIUM
  if (AUTH_PASS(auth) && (flags.replyToDomainMismatch || flags.displayNameMismatch)) {
    return {
      level: 'MEDIUM',
      explanation: `Authentication passed but envelope routing anomaly detected: Reply-To or display name differs from From address.`,
    };
  }

  // Rule 7: All auth PASS + no high-severity indicators → LOW
  // NOTE: FR-EMAIL-011 — NEVER return CLEAN; absence of detection ≠ safe.
  return {
    level: 'LOW',
    explanation: `Authentication passed (SPF: PASS, DKIM: PASS, DMARC: PASS). No high-severity indicators detected. Classification is LOW — absence of detections does not confirm safety.`,
  };
}

export const CREDENTIAL_KEYWORDS = [
  'verify your account',
  'verify your identity',
  'confirm your password',
  'update your credentials',
  'reset your password',
  'enter your password',
  'login to verify',
  'sign in to verify',
  'account suspended',
  'account locked',
  'click here to unlock',
];

export const URGENCY_KEYWORDS = [
  'urgent',
  'immediate action',
  'act now',
  'expires today',
  'limited time',
  'account will be closed',
  'final notice',
  'last warning',
  'immediately',
  'within 24 hours',
  'within 48 hours',
  'your account has been',
];
