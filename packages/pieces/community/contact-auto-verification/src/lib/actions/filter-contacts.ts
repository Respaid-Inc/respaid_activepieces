import { createAction, Property } from '@activepieces/pieces-framework';
import {
  EnrichedContact,
  PrimaryContact,
  DEFAULT_CONFIG,
  NON_CORPORATE_DOMAINS,
} from '../common/types';
import {
  extractEmailDomain,
  isNonCorporateDomain,
  domainsMatch,
  isPartialDomainMatch,
  isRelevantTitle,
  isIrrelevantTitle,
  companiesMatch,
  locationsMatch,
} from '../common/scoring';

export const filterContactsAction = createAction({
  name: 'filter_contacts',
  displayName: 'Filter Contacts (Pre-LLM)',
  description: 'Apply basic filtering rules before LLM evaluation: remove contacts below score threshold, without email, or with domain mismatches. Returns filtered list ready for LLM selection logic.',
  props: {
    contacts: Property.Json({
      displayName: 'Enriched Contacts',
      description: 'Array of enriched contacts to filter',
      required: true,
      defaultValue: [],
    }),
    primaryContact: Property.Json({
      displayName: 'Primary Contact',
      description: 'The primary contact for domain and company matching',
      required: true,
      defaultValue: {
        id: '',
        email: '',
        company_name: '',
      },
    }),
    minScoreThreshold: Property.Number({
      displayName: 'Minimum Score',
      description: 'Contacts with overall score below this are filtered out (default: 7.0 per proposal)',
      required: false,
      defaultValue: 7.0,
    }),
    requireEmail: Property.Checkbox({
      displayName: 'Require Email',
      description: 'Filter out contacts without an email address (default: true)',
      required: false,
      defaultValue: true,
    }),
    requireDomainMatch: Property.Checkbox({
      displayName: 'Require Domain Match',
      description: 'Filter out contacts whose email domain does not match the primary contact (default: true)',
      required: false,
      defaultValue: true,
    }),
    filterPartialDomainMatches: Property.Checkbox({
      displayName: 'Filter Partial Domain Matches',
      description: 'Filter out contacts with partial domain matches (e.g., company.com vs company-mail.com) (default: true)',
      required: false,
      defaultValue: true,
    }),
    filterIrrelevantTitles: Property.Checkbox({
      displayName: 'Filter Irrelevant Titles',
      description: 'Filter out contacts with irrelevant titles (interns, support, etc.) (default: true)',
      required: false,
      defaultValue: true,
    }),
    prioritizeExecutiveTitles: Property.Checkbox({
      displayName: 'Prioritize Executive/Finance Titles',
      description: 'Move contacts with executive or finance titles to the top of the list (default: true)',
      required: false,
      defaultValue: true,
    }),
    filterNonCorporateEmails: Property.Checkbox({
      displayName: 'Filter Non-Corporate Emails',
      description: 'Filter out contacts with free email providers (gmail, yahoo, etc.) (default: true)',
      required: false,
      defaultValue: true,
    }),
    maxResults: Property.Number({
      displayName: 'Max Results',
      description: 'Maximum number of contacts to return after filtering (default: 10)',
      required: false,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const {
      contacts,
      primaryContact,
      minScoreThreshold,
      requireEmail,
      requireDomainMatch,
      filterPartialDomainMatches,
      filterIrrelevantTitles,
      prioritizeExecutiveTitles,
      filterNonCorporateEmails,
      maxResults,
    } = context.propsValue;

    // Parse contacts if string
    const contactsArray: EnrichedContact[] = typeof contacts === 'string'
      ? JSON.parse(contacts)
      : (contacts as EnrichedContact[]);

    // Parse primary contact
    const primary: PrimaryContact = typeof primaryContact === 'string'
      ? JSON.parse(primaryContact)
      : (primaryContact as PrimaryContact);

    // Ensure email_domain is set
    if (!primary.email_domain && primary.email) {
      primary.email_domain = extractEmailDomain(primary.email) || '';
    }

    const primaryDomain = primary.email_domain;
    const primaryIsNonCorporate = isNonCorporateDomain(primaryDomain);

    // Track filtering stats
    const stats = {
      initialCount: contactsArray.length,
      filteredByScore: 0,
      filteredByEmail: 0,
      filteredByDomain: 0,
      filteredByPartialDomain: 0,
      filteredByTitle: 0,
      filteredByNonCorporate: 0,
      finalCount: 0,
    };

    // Apply filters
    let filtered = contactsArray.filter(contact => {
      // Score threshold filter
      if (contact.scores.overall < (minScoreThreshold ?? 7.0)) {
        stats.filteredByScore++;
        return false;
      }

      // Email required filter
      if (requireEmail !== false && !contact.email) {
        stats.filteredByEmail++;
        return false;
      }

      const contactDomain = contact.email_domain || extractEmailDomain(contact.email);

      // Non-corporate email filter
      if (filterNonCorporateEmails !== false && isNonCorporateDomain(contactDomain)) {
        stats.filteredByNonCorporate++;
        return false;
      }

      // Domain match filter (only if primary is corporate)
      if (requireDomainMatch !== false && !primaryIsNonCorporate && contactDomain) {
        if (!domainsMatch(contactDomain, primaryDomain)) {
          stats.filteredByDomain++;
          return false;
        }
      }

      // Partial domain match filter
      if (filterPartialDomainMatches !== false && contactDomain) {
        if (isPartialDomainMatch(contactDomain, primaryDomain)) {
          stats.filteredByPartialDomain++;
          return false;
        }
      }

      // Irrelevant title filter
      if (filterIrrelevantTitles !== false && isIrrelevantTitle(contact.title)) {
        stats.filteredByTitle++;
        return false;
      }

      return true;
    });

    // Sort by executive/finance titles if enabled
    if (prioritizeExecutiveTitles !== false) {
      filtered.sort((a, b) => {
        const aIsRelevant = isRelevantTitle(a.title);
        const bIsRelevant = isRelevantTitle(b.title);

        if (aIsRelevant && !bIsRelevant) return -1;
        if (!aIsRelevant && bIsRelevant) return 1;

        // Secondary sort by score
        return b.scores.overall - a.scores.overall;
      });
    } else {
      // Just sort by score
      filtered.sort((a, b) => b.scores.overall - a.scores.overall);
    }

    // Apply max results limit
    const maxLimit = maxResults ?? 10;
    const finalFiltered = filtered.slice(0, maxLimit);
    stats.finalCount = finalFiltered.length;

    // Analyze primary contact status
    const primaryContactAnalysis = {
      email: primary.email,
      domain: primaryDomain,
      isNonCorporate: primaryIsNonCorporate,
      canUseDomainMatching: !primaryIsNonCorporate,
      company: primary.company_name,
    };

    return {
      filteredContacts: finalFiltered,
      stats,
      primaryContactAnalysis,
      // Helper fields for conditional branching
      hasResults: finalFiltered.length > 0,
      resultCount: finalFiltered.length,
      // Information for LLM processing
      filteringNotes: primaryIsNonCorporate
        ? 'Primary contact uses non-corporate email. Domain matching was skipped. LLM should rely on company name and infer appropriate email domains.'
        : 'Domain matching was applied. All returned contacts have matching email domains.',
    };
  },
});
