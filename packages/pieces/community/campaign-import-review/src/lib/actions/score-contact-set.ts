import { createAction, Property } from '@activepieces/pieces-framework';
import {
  Contact,
  ContactSetScore,
  DEFAULT_SCORING_WEIGHTS,
  DEFAULT_THRESHOLDS,
} from '../common/types';

/**
 * Validates if an email looks valid (basic check)
 */
function isValidEmail(email?: string): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates if a phone number looks valid (basic check)
 */
function isValidPhone(phone?: string): boolean {
  if (!phone) return false;
  // Remove non-numeric characters and check if we have at least 10 digits
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10;
}

/**
 * Checks if contact has company data
 */
function hasCompanyData(contact: Contact): boolean {
  return !!(contact.company && contact.company.trim().length > 0);
}

/**
 * Checks if contact has title/position data
 */
function hasTitleData(contact: Contact): boolean {
  return !!(contact.title && contact.title.trim().length > 0);
}

/**
 * Calculates score for a contact set based on enrichment quality
 */
function calculateScore(
  contacts: Contact[],
  enrichmentRateWeight: number,
  emailWeight: number,
  companyWeight: number,
  titleWeight: number,
  phoneWeight: number
): ContactSetScore {
  const totalContacts = contacts.length;

  if (totalContacts === 0) {
    return {
      score: 0,
      totalContacts: 0,
      enrichedContacts: 0,
      enrichmentRate: 0,
      validEmails: 0,
      validPhones: 0,
      hasCompanyData: 0,
      hasTitleData: 0,
      requiresManualReview: true,
      autoApproved: false,
      autoRejected: true,
      flagReasons: ['Empty contact set'],
      details: {
        emailValidationRate: 0,
        phoneValidationRate: 0,
        companyDataRate: 0,
        titleDataRate: 0,
      },
    };
  }

  // Count metrics
  let enrichedCount = 0;
  let validEmailCount = 0;
  let validPhoneCount = 0;
  let companyDataCount = 0;
  let titleDataCount = 0;

  for (const contact of contacts) {
    if (contact.enriched) enrichedCount++;
    if (isValidEmail(contact.email)) validEmailCount++;
    if (isValidPhone(contact.phone)) validPhoneCount++;
    if (hasCompanyData(contact)) companyDataCount++;
    if (hasTitleData(contact)) titleDataCount++;
  }

  // Calculate rates
  const enrichmentRate = enrichedCount / totalContacts;
  const emailValidationRate = validEmailCount / totalContacts;
  const phoneValidationRate = validPhoneCount / totalContacts;
  const companyDataRate = companyDataCount / totalContacts;
  const titleDataRate = titleDataCount / totalContacts;

  // Calculate weighted score (0-10)
  const totalWeight =
    enrichmentRateWeight + emailWeight + companyWeight + titleWeight + phoneWeight;

  const rawScore =
    (enrichmentRate * enrichmentRateWeight +
      emailValidationRate * emailWeight +
      companyDataRate * companyWeight +
      titleDataRate * titleWeight +
      phoneValidationRate * phoneWeight) /
    totalWeight;

  const score = Math.round(rawScore * 100) / 10; // 0-10 scale with 1 decimal

  // Determine flags
  const flagReasons: string[] = [];

  if (enrichmentRate < DEFAULT_THRESHOLDS.minEnrichmentRate) {
    flagReasons.push(
      `Low enrichment rate: ${Math.round(enrichmentRate * 100)}% (minimum: ${Math.round(DEFAULT_THRESHOLDS.minEnrichmentRate * 100)}%)`
    );
  }

  if (emailValidationRate < 0.5) {
    flagReasons.push(
      `Low email validation rate: ${Math.round(emailValidationRate * 100)}%`
    );
  }

  if (companyDataRate < 0.3) {
    flagReasons.push(
      `Low company data rate: ${Math.round(companyDataRate * 100)}%`
    );
  }

  return {
    score,
    totalContacts,
    enrichedContacts: enrichedCount,
    enrichmentRate,
    validEmails: validEmailCount,
    validPhones: validPhoneCount,
    hasCompanyData: companyDataCount,
    hasTitleData: titleDataCount,
    requiresManualReview: flagReasons.length > 0,
    autoApproved: false,
    autoRejected: false,
    flagReasons,
    details: {
      emailValidationRate,
      phoneValidationRate,
      companyDataRate,
      titleDataRate,
    },
  };
}

export const scoreContactSet = createAction({
  name: 'score_contact_set',
  displayName: 'Score Contact Set',
  description:
    'Calculate a quality score (0-10) for a contact set based on enrichment data. Score of 7+ typically indicates good data quality.',
  props: {
    contacts: Property.Json({
      displayName: 'Contacts',
      description:
        'Array of contact objects. Each contact should have: email, firstName, lastName, phone, company, title, enriched (boolean)',
      required: true,
    }),
    sequenceId: Property.ShortText({
      displayName: 'Sequence ID',
      description: 'Optional identifier for the sequence/campaign',
      required: false,
    }),
    sequenceName: Property.ShortText({
      displayName: 'Sequence Name',
      description: 'Optional name for the sequence/campaign',
      required: false,
    }),
    enrichmentRateWeight: Property.Number({
      displayName: 'Enrichment Rate Weight',
      description: 'Weight for enrichment rate in score calculation (default: 4)',
      required: false,
      defaultValue: DEFAULT_SCORING_WEIGHTS.enrichmentRate,
    }),
    emailWeight: Property.Number({
      displayName: 'Email Validation Weight',
      description: 'Weight for email validation in score calculation (default: 2)',
      required: false,
      defaultValue: DEFAULT_SCORING_WEIGHTS.emailValidation,
    }),
    companyWeight: Property.Number({
      displayName: 'Company Data Weight',
      description: 'Weight for company data in score calculation (default: 2)',
      required: false,
      defaultValue: DEFAULT_SCORING_WEIGHTS.companyData,
    }),
    titleWeight: Property.Number({
      displayName: 'Title Data Weight',
      description: 'Weight for title/position data in score calculation (default: 1)',
      required: false,
      defaultValue: DEFAULT_SCORING_WEIGHTS.titleData,
    }),
    phoneWeight: Property.Number({
      displayName: 'Phone Data Weight',
      description: 'Weight for phone data in score calculation (default: 1)',
      required: false,
      defaultValue: DEFAULT_SCORING_WEIGHTS.phoneData,
    }),
  },
  async run({ propsValue }) {
    const contacts = propsValue.contacts as Contact[];

    if (!Array.isArray(contacts)) {
      throw new Error('Contacts must be an array');
    }

    const result = calculateScore(
      contacts,
      propsValue.enrichmentRateWeight ?? DEFAULT_SCORING_WEIGHTS.enrichmentRate,
      propsValue.emailWeight ?? DEFAULT_SCORING_WEIGHTS.emailValidation,
      propsValue.companyWeight ?? DEFAULT_SCORING_WEIGHTS.companyData,
      propsValue.titleWeight ?? DEFAULT_SCORING_WEIGHTS.titleData,
      propsValue.phoneWeight ?? DEFAULT_SCORING_WEIGHTS.phoneData
    );

    return {
      ...result,
      sequenceId: propsValue.sequenceId,
      sequenceName: propsValue.sequenceName,
    };
  },
});
