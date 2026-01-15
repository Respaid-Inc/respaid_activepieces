/**
 * Contact scoring and evaluation logic
 */

import {
  EnrichedContact,
  PrimaryContact,
  VerificationResult,
  VerificationStatus,
  VerificationAction,
  RedFlagReason,
  VerificationConfig,
  DEFAULT_CONFIG,
  NON_CORPORATE_DOMAINS,
  EXECUTIVE_TITLES,
  FINANCE_TITLES,
  IRRELEVANT_TITLES,
} from './types';

/**
 * Extract domain from email address
 */
export function extractEmailDomain(email: string | undefined): string | undefined {
  if (!email) return undefined;
  const parts = email.toLowerCase().trim().split('@');
  return parts.length === 2 ? parts[1] : undefined;
}

/**
 * Check if email domain is non-corporate (free email provider)
 */
export function isNonCorporateDomain(domain: string | undefined): boolean {
  if (!domain) return true;
  return NON_CORPORATE_DOMAINS.includes(domain.toLowerCase());
}

/**
 * Check if domains match exactly
 */
export function domainsMatch(domain1: string | undefined, domain2: string | undefined): boolean {
  if (!domain1 || !domain2) return false;
  return domain1.toLowerCase() === domain2.toLowerCase();
}

/**
 * Check if domain is a partial/variant match (e.g., company.com vs company-mail.com)
 * Returns true if domains DON'T match but one contains the other
 */
export function isPartialDomainMatch(domain1: string | undefined, domain2: string | undefined): boolean {
  if (!domain1 || !domain2) return false;
  const d1 = domain1.toLowerCase();
  const d2 = domain2.toLowerCase();

  if (d1 === d2) return false; // Exact match, not partial

  // Check if one domain contains the other but with extra characters
  const d1Base = d1.split('.')[0];
  const d2Base = d2.split('.')[0];

  return (d1Base.includes(d2Base) || d2Base.includes(d1Base)) && d1Base !== d2Base;
}

/**
 * Check if title is executive/finance related
 */
export function isRelevantTitle(title: string | undefined): boolean {
  if (!title) return false;
  const normalizedTitle = title.toLowerCase();

  // Check executive titles
  const hasExecutiveTitle = EXECUTIVE_TITLES.some(exec =>
    normalizedTitle.includes(exec)
  );

  // Check finance titles
  const hasFinanceTitle = FINANCE_TITLES.some(fin =>
    normalizedTitle.includes(fin)
  );

  return hasExecutiveTitle || hasFinanceTitle;
}

/**
 * Check if title is irrelevant (should be filtered out)
 */
export function isIrrelevantTitle(title: string | undefined): boolean {
  if (!title) return false;
  const normalizedTitle = title.toLowerCase();

  return IRRELEVANT_TITLES.some(irr =>
    normalizedTitle.includes(irr)
  );
}

/**
 * Normalize company name for comparison
 * Removes common suffixes (Inc., LLC, Ltd., etc.) and standardizes format
 */
export function normalizeCompanyName(name: string | undefined): string {
  if (!name) return '';

  return name
    .toLowerCase()
    .replace(/\b(inc\.?|llc\.?|ltd\.?|limited|corp\.?|corporation|gmbh|s\.?a\.?|ag|plc|co\.?|company)\b/gi, '')
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if company names likely refer to the same company
 */
export function companiesMatch(company1: string | undefined, company2: string | undefined): boolean {
  if (!company1 || !company2) return false;

  const norm1 = normalizeCompanyName(company1);
  const norm2 = normalizeCompanyName(company2);

  // Exact match after normalization
  if (norm1 === norm2) return true;

  // One contains the other (handles variants like "Google" vs "Google Inc")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Handle rebrands/aliases (simplified - could be extended with a mapping)
  const aliases: Record<string, string[]> = {
    'google': ['alphabet', 'google inc', 'google llc'],
    'facebook': ['meta', 'meta platforms'],
    'microsoft': ['ms', 'msft'],
  };

  for (const [main, aliasSet] of Object.entries(aliases)) {
    const allNames = [main, ...aliasSet];
    const matches1 = allNames.some(a => norm1.includes(a));
    const matches2 = allNames.some(a => norm2.includes(a));
    if (matches1 && matches2) return true;
  }

  return false;
}

/**
 * Normalize location for comparison
 * Handles spelling variants and abbreviations
 */
export function normalizeLocation(location: string | undefined): string {
  if (!location) return '';

  let normalized = location.toLowerCase().trim();

  // Common location abbreviations and variants
  const locationMappings: Record<string, string> = {
    'sf': 'san francisco',
    'la': 'los angeles',
    'nyc': 'new york city',
    'ny': 'new york',
    'dc': 'washington dc',
    'uk': 'united kingdom',
    'gb': 'united kingdom',
    'usa': 'united states',
    'us': 'united states',
    'kiev': 'kyiv',
  };

  for (const [abbr, full] of Object.entries(locationMappings)) {
    if (normalized === abbr || normalized.startsWith(abbr + ',') || normalized.endsWith(', ' + abbr)) {
      normalized = normalized.replace(new RegExp(`\\b${abbr}\\b`, 'g'), full);
    }
  }

  return normalized;
}

/**
 * Check if locations match (country/region level)
 */
export function locationsMatch(
  location1: string | undefined,
  country1: string | undefined,
  location2: string | undefined,
  country2: string | undefined
): boolean {
  // Country match is primary
  if (country1 && country2) {
    const normCountry1 = normalizeLocation(country1);
    const normCountry2 = normalizeLocation(country2);
    if (normCountry1 === normCountry2) return true;
  }

  // Fall back to location string comparison
  if (location1 && location2) {
    const normLoc1 = normalizeLocation(location1);
    const normLoc2 = normalizeLocation(location2);

    // Check for overlap (city, state, or country match)
    const parts1 = normLoc1.split(/[,\s]+/).filter(p => p.length > 2);
    const parts2 = normLoc2.split(/[,\s]+/).filter(p => p.length > 2);

    return parts1.some(p1 => parts2.some(p2 => p1 === p2));
  }

  return false;
}

/**
 * Evaluate a single contact against the primary contact and config
 */
export function evaluateContact(
  contact: EnrichedContact,
  primaryContact: PrimaryContact,
  config: VerificationConfig = DEFAULT_CONFIG
): VerificationResult {
  const flags: RedFlagReason[] = [];
  const scores = contact.scores;

  // Check for missing email
  if (!contact.email) {
    flags.push(RedFlagReason.MISSING_EMAIL);
  }

  // Extract and check domains
  const contactDomain = contact.email_domain || extractEmailDomain(contact.email);
  const primaryDomain = primaryContact.email_domain;

  // Check for non-corporate email (can't use domain matching)
  const primaryIsNonCorporate = isNonCorporateDomain(primaryDomain);

  // Domain matching logic
  if (!primaryIsNonCorporate && contactDomain) {
    if (!domainsMatch(contactDomain, primaryDomain)) {
      flags.push(RedFlagReason.DOMAIN_MISMATCH);
    }
    if (isPartialDomainMatch(contactDomain, primaryDomain)) {
      flags.push(RedFlagReason.DOMAIN_MISMATCH);
    }
  }

  if (isNonCorporateDomain(contactDomain)) {
    flags.push(RedFlagReason.NON_CORPORATE_EMAIL);
  }

  // Score-based checks
  if (scores.overall < config.minScoreThreshold) {
    flags.push(RedFlagReason.LOW_OVERALL_SCORE);
  }

  if (scores.domain_name < config.domainScoreThreshold) {
    flags.push(RedFlagReason.LOW_DOMAIN_SCORE);
  }

  if (scores.company_name < config.companyScoreThreshold) {
    flags.push(RedFlagReason.LOW_COMPANY_SCORE);
  }

  if (scores.location < config.locationScoreThreshold) {
    flags.push(RedFlagReason.LOCATION_MISMATCH);
  }

  // Company matching
  const companyMatches = companiesMatch(
    contact.company_name || contact.current_employer,
    primaryContact.company_name
  );
  if (!companyMatches) {
    flags.push(RedFlagReason.COMPANY_MISMATCH);
  }

  // Title relevance check
  if (contact.title) {
    if (isIrrelevantTitle(contact.title)) {
      flags.push(RedFlagReason.IRRELEVANT_TITLE);
    }
  }

  // Location matching
  const locationMatches = locationsMatch(
    contact.location,
    contact.country,
    primaryContact.location,
    primaryContact.country
  );
  if (!locationMatches && primaryContact.location) {
    // Only flag if primary has location info
    if (!flags.includes(RedFlagReason.LOCATION_MISMATCH)) {
      flags.push(RedFlagReason.LOCATION_MISMATCH);
    }
  }

  // Determine verification status and action
  let status: VerificationStatus;
  let action: VerificationAction;
  let summary: string;

  // Auto-skip if score is too low or missing email
  if (scores.overall < config.minScoreThreshold ||
      flags.includes(RedFlagReason.MISSING_EMAIL)) {
    status = VerificationStatus.SKIPPED;
    action = VerificationAction.AUTO_REJECT;
    summary = `Auto-skipped: Score ${scores.overall.toFixed(1)} below threshold or missing email`;
  }
  // Red-flag if has concerning flags but score is in middle range
  else if (flags.length > 0 && scores.overall < config.autoVerifyThreshold) {
    status = VerificationStatus.RED_FLAGGED;
    action = VerificationAction.MANUAL_REVIEW;
    summary = `Red-flagged for review: ${flags.join(', ')}`;
  }
  // Auto-verify if score is high and critical checks pass
  else if (scores.overall >= config.autoVerifyThreshold &&
           !flags.includes(RedFlagReason.DOMAIN_MISMATCH) &&
           !flags.includes(RedFlagReason.MISSING_EMAIL) &&
           !flags.includes(RedFlagReason.NON_CORPORATE_EMAIL)) {
    status = VerificationStatus.VERIFIED;
    action = VerificationAction.AUTO_APPROVE;
    summary = `Auto-verified: Score ${scores.overall.toFixed(1)}, all critical checks passed`;
  }
  // Default to red-flag for uncertain cases
  else {
    status = VerificationStatus.RED_FLAGGED;
    action = VerificationAction.MANUAL_REVIEW;
    summary = `Flagged for review: Score ${scores.overall.toFixed(1)}, flags: ${flags.join(', ') || 'none'}`;
  }

  return {
    contact,
    status,
    action,
    flags,
    summary,
  };
}

/**
 * Process multiple contacts and return verification summary
 */
export function processContacts(
  contacts: EnrichedContact[],
  primaryContact: PrimaryContact,
  config: VerificationConfig = DEFAULT_CONFIG
): { results: VerificationResult[]; autoVerifiedCount: number; redFlaggedCount: number; skippedCount: number } {
  let autoVerifiedCount = 0;

  const results = contacts.map(contact => {
    const result = evaluateContact(contact, primaryContact, config);

    // Enforce max auto-verified limit
    if (result.action === VerificationAction.AUTO_APPROVE) {
      if (autoVerifiedCount >= config.maxAutoVerified) {
        result.status = VerificationStatus.RED_FLAGGED;
        result.action = VerificationAction.MANUAL_REVIEW;
        result.summary = `Max auto-verified (${config.maxAutoVerified}) reached, flagged for review`;
      } else {
        autoVerifiedCount++;
      }
    }

    return result;
  });

  return {
    results,
    autoVerifiedCount,
    redFlaggedCount: results.filter(r => r.status === VerificationStatus.RED_FLAGGED).length,
    skippedCount: results.filter(r => r.status === VerificationStatus.SKIPPED).length,
  };
}

/**
 * Generate a formatted summary for Slack notification
 */
export function generateSlackSummary(
  sequenceId: string,
  sequenceLink: string | undefined,
  results: VerificationResult[],
  autoVerifiedCount: number,
  redFlaggedCount: number,
  skippedCount: number
): string {
  const lines: string[] = [];

  lines.push(`*Contact Auto-Verification Summary*`);
  lines.push(`Sequence: ${sequenceLink ? `<${sequenceLink}|${sequenceId}>` : sequenceId}`);
  lines.push('');
  lines.push(`Auto-verified: ${autoVerifiedCount}`);
  lines.push(`Red-flagged: ${redFlaggedCount}`);
  lines.push(`Skipped: ${skippedCount}`);

  // List red-flagged contacts
  const redFlagged = results.filter(r => r.status === VerificationStatus.RED_FLAGGED);
  if (redFlagged.length > 0) {
    lines.push('');
    lines.push('*Red-Flagged Contacts (require manual review):*');

    redFlagged.slice(0, 10).forEach((result, index) => {
      const contact = result.contact;
      const name = contact.full_name || `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || 'Unknown';
      const company = contact.company_name || contact.current_employer || 'Unknown Company';
      const title = contact.title || 'No Title';
      const flagsText = result.flags.length > 0 ? result.flags.join(', ') : 'score threshold';

      lines.push(`${index + 1}. *${name}* - ${title} @ ${company}`);
      lines.push(`   Email: ${contact.email || 'N/A'}`);
      lines.push(`   Score: ${contact.scores.overall.toFixed(1)} | Flags: ${flagsText}`);
    });

    if (redFlagged.length > 10) {
      lines.push(`... and ${redFlagged.length - 10} more`);
    }
  }

  return lines.join('\n');
}
