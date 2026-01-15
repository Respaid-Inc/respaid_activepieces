import { createAction, Property } from '@activepieces/pieces-framework';
import {
  EnrichedContact,
  PrimaryContact,
  DEFAULT_CONFIG,
} from '../common/types';
import {
  evaluateContact,
  extractEmailDomain,
} from '../common/scoring';

export const evaluateContactAction = createAction({
  name: 'evaluate_contact',
  displayName: 'Evaluate Single Contact',
  description: 'Evaluate a single enriched contact against the primary contact and return verification status with any red flags.',
  props: {
    contact: Property.Json({
      displayName: 'Enriched Contact',
      description: 'The enriched contact to evaluate. Should include: id, email, company_name, title, location, country, and scores object.',
      required: true,
      defaultValue: {
        id: '',
        email: '',
        company_name: '',
        title: '',
        scores: {
          overall: 0,
          domain_name: 0,
          company_name: 0,
          location: 0,
          title: 0,
          email_validity: 0,
        },
      },
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
      description: 'Minimum overall score to auto-verify (default: 7.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.autoVerifyThreshold,
    }),
    minScoreThreshold: Property.Number({
      displayName: 'Minimum Score Threshold',
      description: 'Scores below this are auto-skipped (default: 4.0)',
      required: false,
      defaultValue: DEFAULT_CONFIG.minScoreThreshold,
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
  },
  async run(context) {
    const {
      contact,
      primaryContact,
      autoVerifyThreshold,
      minScoreThreshold,
      domainScoreThreshold,
      companyScoreThreshold,
    } = context.propsValue;

    // Parse contact if string
    const enrichedContact: EnrichedContact = typeof contact === 'string'
      ? JSON.parse(contact)
      : (contact as EnrichedContact);

    // Parse primary contact
    const primary: PrimaryContact = typeof primaryContact === 'string'
      ? JSON.parse(primaryContact)
      : (primaryContact as PrimaryContact);

    // Ensure email_domain is set
    if (!primary.email_domain && primary.email) {
      primary.email_domain = extractEmailDomain(primary.email) || '';
    }

    if (!enrichedContact.email_domain && enrichedContact.email) {
      enrichedContact.email_domain = extractEmailDomain(enrichedContact.email);
    }

    // Build config
    const config = {
      ...DEFAULT_CONFIG,
      autoVerifyThreshold: autoVerifyThreshold ?? DEFAULT_CONFIG.autoVerifyThreshold,
      minScoreThreshold: minScoreThreshold ?? DEFAULT_CONFIG.minScoreThreshold,
      domainScoreThreshold: domainScoreThreshold ?? DEFAULT_CONFIG.domainScoreThreshold,
      companyScoreThreshold: companyScoreThreshold ?? DEFAULT_CONFIG.companyScoreThreshold,
    };

    // Evaluate the contact
    const result = evaluateContact(enrichedContact, primary, config);

    return {
      contact: result.contact,
      status: result.status,
      action: result.action,
      flags: result.flags,
      summary: result.summary,
      // Boolean flags for conditional branching
      isVerified: result.status === 'verified',
      isRedFlagged: result.status === 'red_flagged',
      isSkipped: result.status === 'skipped',
      shouldAutoApprove: result.action === 'auto_approve',
      shouldManualReview: result.action === 'manual_review',
      shouldAutoReject: result.action === 'auto_reject',
    };
  },
});
