import { createAction, Property } from '@activepieces/pieces-framework';
import {
  EnrichedContact,
  PrimaryContact,
  VerificationConfig,
  DEFAULT_CONFIG,
  VerificationStatus,
} from '../common/types';
import {
  processContacts,
  extractEmailDomain,
} from '../common/scoring';

export const autoVerifyContactsAction = createAction({
  name: 'auto_verify_contacts',
  displayName: 'Auto-Verify Enriched Contacts',
  description: 'Automatically verify enriched contacts based on score thresholds and filtering rules. Contacts with score >= 7 are auto-approved, 4-7 with issues are red-flagged, and < 4 are auto-skipped.',
  props: {
    contacts: Property.Json({
      displayName: 'Enriched Contacts',
      description: 'Array of enriched contacts with scores. Each contact should have: id, email, company_name, title, location, country, and scores object with overall, domain_name, company_name, location scores.',
      required: true,
      defaultValue: [],
    }),
    primaryContact: Property.Json({
      displayName: 'Primary Contact',
      description: 'The primary contact to match against. Should have: id, email, email_domain, company_name, location, country.',
      required: true,
      defaultValue: {
        id: '',
        email: '',
        company_name: '',
      },
    }),
    autoVerifyThreshold: Property.Number({
      displayName: 'Auto-Verify Threshold',
      description: 'Minimum overall score to auto-verify contacts (default: 7.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.autoVerifyThreshold,
    }),
    minScoreThreshold: Property.Number({
      displayName: 'Minimum Score Threshold',
      description: 'Contacts with scores below this are auto-skipped (default: 4.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.minScoreThreshold,
    }),
    maxAutoVerified: Property.Number({
      displayName: 'Max Auto-Verified',
      description: 'Maximum number of contacts to auto-verify per sequence (default: 3)',
      required: false,
      defaultValue: DEFAULT_CONFIG.maxAutoVerified,
    }),
    domainScoreThreshold: Property.Number({
      displayName: 'Domain Score Threshold',
      description: 'Domain score below this triggers red-flag (default: 6.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.domainScoreThreshold,
    }),
    companyScoreThreshold: Property.Number({
      displayName: 'Company Score Threshold',
      description: 'Company score below this triggers red-flag (default: 5.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.companyScoreThreshold,
    }),
    locationScoreThreshold: Property.Number({
      displayName: 'Location Score Threshold',
      description: 'Location score below this triggers red-flag (default: 1.0, meaning 0 triggers)',
      required: false,
      defaultValue: DEFAULT_CONFIG.locationScoreThreshold,
    }),
  },
  async run(context) {
    const {
      contacts,
      primaryContact,
      autoVerifyThreshold,
      minScoreThreshold,
      maxAutoVerified,
      domainScoreThreshold,
      companyScoreThreshold,
      locationScoreThreshold,
    } = context.propsValue;

    // Parse contacts if string
    const contactsArray: EnrichedContact[] = typeof contacts === 'string'
      ? JSON.parse(contacts)
      : (contacts as EnrichedContact[]);

    // Parse primary contact
    const primary: PrimaryContact = typeof primaryContact === 'string'
      ? JSON.parse(primaryContact)
      : (primaryContact as PrimaryContact);

    // Ensure primary contact has email_domain
    if (!primary.email_domain && primary.email) {
      primary.email_domain = extractEmailDomain(primary.email) || '';
    }

    // Build config
    const config: VerificationConfig = {
      autoVerifyThreshold: autoVerifyThreshold ?? DEFAULT_CONFIG.autoVerifyThreshold,
      minScoreThreshold: minScoreThreshold ?? DEFAULT_CONFIG.minScoreThreshold,
      maxAutoVerified: maxAutoVerified ?? DEFAULT_CONFIG.maxAutoVerified,
      domainScoreThreshold: domainScoreThreshold ?? DEFAULT_CONFIG.domainScoreThreshold,
      companyScoreThreshold: companyScoreThreshold ?? DEFAULT_CONFIG.companyScoreThreshold,
      locationScoreThreshold: locationScoreThreshold ?? DEFAULT_CONFIG.locationScoreThreshold,
      enabled: true,
    };

    // Process contacts
    const { results, autoVerifiedCount, redFlaggedCount, skippedCount } = processContacts(
      contactsArray,
      primary,
      config
    );

    // Separate results by status
    const autoVerified = results.filter(r => r.status === VerificationStatus.VERIFIED);
    const redFlagged = results.filter(r => r.status === VerificationStatus.RED_FLAGGED);
    const skipped = results.filter(r => r.status === VerificationStatus.SKIPPED);

    return {
      summary: {
        totalContacts: contactsArray.length,
        autoVerified: autoVerifiedCount,
        redFlagged: redFlaggedCount,
        skipped: skippedCount,
      },
      config,
      results: {
        autoVerified: autoVerified.map(r => ({
          contact: r.contact,
          summary: r.summary,
        })),
        redFlagged: redFlagged.map(r => ({
          contact: r.contact,
          flags: r.flags,
          summary: r.summary,
        })),
        skipped: skipped.map(r => ({
          contact: r.contact,
          flags: r.flags,
          summary: r.summary,
        })),
      },
      // Flat arrays for easy iteration in flows
      autoVerifiedContacts: autoVerified.map(r => r.contact),
      redFlaggedContacts: redFlagged.map(r => r.contact),
      skippedContacts: skipped.map(r => r.contact),
      // Boolean flags for conditional branching
      hasRedFlagged: redFlagged.length > 0,
      hasAutoVerified: autoVerified.length > 0,
    };
  },
});
