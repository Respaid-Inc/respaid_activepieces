import { createAction, Property } from '@activepieces/pieces-framework';
import {
  ContactSetScore,
  ReviewDecision,
  DEFAULT_THRESHOLDS,
} from '../common/types';

export const autoReviewContacts = createAction({
  name: 'auto_review_contacts',
  displayName: 'Auto-Review Contact Set',
  description:
    'Automatically approve, reject, or flag a contact set for manual review based on its score and configurable thresholds. Uses 7/10 minimum enrichment rate by default.',
  props: {
    scoreResult: Property.Json({
      displayName: 'Score Result',
      description:
        'The result from the "Score Contact Set" action. Contains score, enrichment rate, and other metrics.',
      required: true,
    }),
    autoApproveThreshold: Property.Number({
      displayName: 'Auto-Approve Threshold',
      description:
        'Score >= this value will be auto-approved (default: 8). Contact sets with excellent data quality are approved automatically.',
      required: false,
      defaultValue: DEFAULT_THRESHOLDS.autoApproveThreshold,
    }),
    autoRejectThreshold: Property.Number({
      displayName: 'Auto-Reject Threshold',
      description:
        'Score < this value will be auto-rejected (default: 5). Contact sets with poor data quality are rejected automatically.',
      required: false,
      defaultValue: DEFAULT_THRESHOLDS.autoRejectThreshold,
    }),
    minEnrichmentRate: Property.Number({
      displayName: 'Minimum Enrichment Rate',
      description:
        'Minimum enrichment rate required (0-1, default: 0.7 = 70%). As per team discussion, skip contact sets with less than 7/10 found contacts.',
      required: false,
      defaultValue: DEFAULT_THRESHOLDS.minEnrichmentRate,
    }),
    strictEnrichmentCheck: Property.Checkbox({
      displayName: 'Strict Enrichment Check',
      description:
        'If enabled, contact sets below minimum enrichment rate will be auto-rejected regardless of other scores.',
      required: false,
      defaultValue: true,
    }),
  },
  async run({ propsValue }) {
    const scoreResult = propsValue.scoreResult as ContactSetScore;

    if (!scoreResult || typeof scoreResult.score !== 'number') {
      throw new Error(
        'Invalid score result. Please provide the output from "Score Contact Set" action.'
      );
    }

    const autoApproveThreshold =
      propsValue.autoApproveThreshold ?? DEFAULT_THRESHOLDS.autoApproveThreshold;
    const autoRejectThreshold =
      propsValue.autoRejectThreshold ?? DEFAULT_THRESHOLDS.autoRejectThreshold;
    const minEnrichmentRate =
      propsValue.minEnrichmentRate ?? DEFAULT_THRESHOLDS.minEnrichmentRate;
    const strictEnrichmentCheck = propsValue.strictEnrichmentCheck ?? true;

    // Decision logic
    let decision: ReviewDecision;
    const reasons: string[] = [];

    // Check enrichment rate first (per Helmi's suggestion: skip <7/10 found contacts)
    if (strictEnrichmentCheck && scoreResult.enrichmentRate < minEnrichmentRate) {
      decision = ReviewDecision.AUTO_REJECTED;
      reasons.push(
        `Enrichment rate (${Math.round(scoreResult.enrichmentRate * 100)}%) below minimum threshold (${Math.round(minEnrichmentRate * 100)}%)`
      );
    } else if (scoreResult.score >= autoApproveThreshold) {
      decision = ReviewDecision.AUTO_APPROVED;
      reasons.push(
        `Score (${scoreResult.score}/10) meets or exceeds auto-approve threshold (${autoApproveThreshold}/10)`
      );
    } else if (scoreResult.score < autoRejectThreshold) {
      decision = ReviewDecision.AUTO_REJECTED;
      reasons.push(
        `Score (${scoreResult.score}/10) below auto-reject threshold (${autoRejectThreshold}/10)`
      );
    } else {
      decision = ReviewDecision.MANUAL_REVIEW;
      reasons.push(
        `Score (${scoreResult.score}/10) between thresholds - requires manual review`
      );

      // Add any flag reasons from scoring
      if (scoreResult.flagReasons && scoreResult.flagReasons.length > 0) {
        reasons.push(...scoreResult.flagReasons);
      }
    }

    // Build summary message for Slack/Linear
    const summaryParts = [
      `**Contact Set Review Decision: ${decision.replace('_', ' ').toUpperCase()}**`,
      '',
      `**Score:** ${scoreResult.score}/10`,
      `**Total Contacts:** ${scoreResult.totalContacts}`,
      `**Enriched Contacts:** ${scoreResult.enrichedContacts} (${Math.round(scoreResult.enrichmentRate * 100)}%)`,
      `**Valid Emails:** ${scoreResult.validEmails}`,
      `**Valid Phones:** ${scoreResult.validPhones}`,
      `**Has Company Data:** ${scoreResult.hasCompanyData}`,
      `**Has Title Data:** ${scoreResult.hasTitleData}`,
      '',
      '**Reasons:**',
      ...reasons.map((r) => `- ${r}`),
    ];

    if (scoreResult.sequenceId || scoreResult.sequenceName) {
      summaryParts.unshift(
        `**Sequence:** ${scoreResult.sequenceName || scoreResult.sequenceId}`,
        ''
      );
    }

    return {
      decision,
      isAutoApproved: decision === ReviewDecision.AUTO_APPROVED,
      isAutoRejected: decision === ReviewDecision.AUTO_REJECTED,
      requiresManualReview: decision === ReviewDecision.MANUAL_REVIEW,
      reasons,
      summary: summaryParts.join('\n'),
      // Pass through original data
      score: scoreResult.score,
      sequenceId: scoreResult.sequenceId,
      sequenceName: scoreResult.sequenceName,
      totalContacts: scoreResult.totalContacts,
      enrichedContacts: scoreResult.enrichedContacts,
      enrichmentRate: scoreResult.enrichmentRate,
      validEmails: scoreResult.validEmails,
      validPhones: scoreResult.validPhones,
      hasCompanyData: scoreResult.hasCompanyData,
      hasTitleData: scoreResult.hasTitleData,
      details: scoreResult.details,
      // Thresholds used for this decision
      thresholds: {
        autoApproveThreshold,
        autoRejectThreshold,
        minEnrichmentRate,
        strictEnrichmentCheck,
      },
    };
  },
});
