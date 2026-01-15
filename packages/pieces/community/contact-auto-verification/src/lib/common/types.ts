/**
 * Contact verification types and interfaces
 */

export interface ContactScores {
  overall: number;
  domain_name: number;
  company_name: number;
  location: number;
  title: number;
  email_validity: number;
  phone?: number;
}

export interface EnrichedContact {
  id: string;
  email?: string;
  email_domain?: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  company_name?: string;
  current_employer?: string;
  title?: string;
  location?: string;
  country?: string;
  city?: string;
  phone?: string;
  linkedin_url?: string;
  scores: ContactScores;
  raw_data?: Record<string, unknown>;
}

export interface PrimaryContact {
  id: string;
  email: string;
  email_domain: string;
  company_name: string;
  location?: string;
  country?: string;
  city?: string;
}

export interface VerificationResult {
  contact: EnrichedContact;
  status: VerificationStatus;
  action: VerificationAction;
  flags: RedFlagReason[];
  summary: string;
}

export enum VerificationStatus {
  VERIFIED = 'verified',
  RED_FLAGGED = 'red_flagged',
  SKIPPED = 'skipped',
  PENDING_REVIEW = 'pending_review',
}

export enum VerificationAction {
  AUTO_APPROVE = 'auto_approve',
  MANUAL_REVIEW = 'manual_review',
  AUTO_REJECT = 'auto_reject',
}

export enum RedFlagReason {
  LOW_OVERALL_SCORE = 'low_overall_score',
  DOMAIN_MISMATCH = 'domain_mismatch',
  COMPANY_MISMATCH = 'company_mismatch',
  LOCATION_MISMATCH = 'location_mismatch',
  MISSING_EMAIL = 'missing_email',
  NON_CORPORATE_EMAIL = 'non_corporate_email',
  IRRELEVANT_TITLE = 'irrelevant_title',
  LOW_DOMAIN_SCORE = 'low_domain_score',
  LOW_COMPANY_SCORE = 'low_company_score',
}

export interface VerificationConfig {
  autoVerifyThreshold: number;
  minScoreThreshold: number;
  maxAutoVerified: number;
  domainScoreThreshold: number;
  companyScoreThreshold: number;
  locationScoreThreshold: number;
  enabled: boolean;
}

export const DEFAULT_CONFIG: VerificationConfig = {
  autoVerifyThreshold: 7.0,
  minScoreThreshold: 4.0,
  maxAutoVerified: 3,
  domainScoreThreshold: 6.0,
  companyScoreThreshold: 5.0,
  locationScoreThreshold: 1.0,
  enabled: true,
};

export interface VerificationSummary {
  totalContacts: number;
  autoVerified: number;
  redFlagged: number;
  autoSkipped: number;
  results: VerificationResult[];
}

/**
 * Common non-corporate email domains that cannot be used for domain matching
 */
export const NON_CORPORATE_DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'aol.com',
  'icloud.com',
  'mail.com',
  'protonmail.com',
  'ukr.net',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'live.com',
  'msn.com',
  'gmx.com',
  'gmx.net',
  'zoho.com',
  'tutanota.com',
  'fastmail.com',
];

/**
 * Executive and finance-related titles to prioritize
 */
export const EXECUTIVE_TITLES = [
  'ceo',
  'cfo',
  'coo',
  'cio',
  'cto',
  'cmo',
  'cro',
  'vp',
  'vice president',
  'director',
  'managing director',
  'head of',
  'founder',
  'co-founder',
  'cofounder',
  'president',
  'owner',
  'partner',
  'principal',
  'general manager',
  'gm',
];

export const FINANCE_TITLES = [
  'finance director',
  'head of finance',
  'financial controller',
  'chief accountant',
  'accounting manager',
  'finance manager',
  'treasurer',
  'controller',
  'comptroller',
  'financial analyst',
  'senior accountant',
  'accounts payable',
  'accounts receivable',
  'bookkeeper',
  'financial officer',
];

/**
 * Titles to filter out (irrelevant technical/operational roles)
 */
export const IRRELEVANT_TITLES = [
  'intern',
  'trainee',
  'junior developer',
  'junior engineer',
  'support specialist',
  'customer support',
  'help desk',
  'receptionist',
  'administrative assistant',
  'data entry',
];
