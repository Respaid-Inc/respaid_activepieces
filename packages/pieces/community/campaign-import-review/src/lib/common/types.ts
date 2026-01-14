/**
 * Contact data structure for scoring
 */
export interface Contact {
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  title?: string;
  linkedInUrl?: string;
  // Enrichment data
  enriched?: boolean;
  enrichmentSource?: string;
  // Additional fields from enrichment
  [key: string]: unknown;
}

/**
 * Contact set with metadata for scoring
 */
export interface ContactSet {
  sequenceId?: string;
  sequenceName?: string;
  contacts: Contact[];
  totalContacts: number;
  enrichedContacts: number;
  metadata?: Record<string, unknown>;
}

/**
 * Scoring result for a contact set
 */
export interface ContactSetScore {
  sequenceId?: string;
  sequenceName?: string;
  score: number; // 0-10
  totalContacts: number;
  enrichedContacts: number;
  enrichmentRate: number; // 0-1
  validEmails: number;
  validPhones: number;
  hasCompanyData: number;
  hasTitleData: number;
  // Flags
  requiresManualReview: boolean;
  autoApproved: boolean;
  autoRejected: boolean;
  flagReasons: string[];
  // Raw data for debugging
  details: {
    emailValidationRate: number;
    phoneValidationRate: number;
    companyDataRate: number;
    titleDataRate: number;
  };
}

/**
 * Review decision
 */
export enum ReviewDecision {
  AUTO_APPROVED = 'auto_approved',
  AUTO_REJECTED = 'auto_rejected',
  MANUAL_REVIEW = 'manual_review',
}

/**
 * Threshold configuration
 */
export interface ThresholdConfig {
  autoApproveThreshold: number; // Score >= this gets auto-approved
  autoRejectThreshold: number; // Score < this gets auto-rejected
  minEnrichmentRate: number; // Minimum enrichment rate (0-1)
}

/**
 * Default scoring weights
 */
export const DEFAULT_SCORING_WEIGHTS = {
  enrichmentRate: 4, // 40% weight
  emailValidation: 2, // 20% weight
  companyData: 2, // 20% weight
  titleData: 1, // 10% weight
  phoneData: 1, // 10% weight
};

/**
 * Default thresholds
 */
export const DEFAULT_THRESHOLDS: ThresholdConfig = {
  autoApproveThreshold: 8, // 8/10 or higher = auto-approve
  autoRejectThreshold: 5, // Below 5/10 = auto-reject
  minEnrichmentRate: 0.7, // 70% minimum enrichment rate (7/10 found contacts)
};
