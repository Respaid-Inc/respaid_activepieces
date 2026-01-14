import { createAction, Property } from '@activepieces/pieces-framework';

interface ReviewResult {
  decision: string;
  score: number;
  sequenceId?: string;
  sequenceName?: string;
  totalContacts: number;
  enrichedContacts: number;
  enrichmentRate: number;
}

export const bulkReviewSummary = createAction({
  name: 'bulk_review_summary',
  displayName: 'Bulk Review Summary',
  description:
    'Generate a summary report for multiple contact set reviews. Useful for daily/weekly review reports.',
  props: {
    reviewResults: Property.Json({
      displayName: 'Review Results',
      description:
        'Array of review results from "Auto-Review Contact Set" actions.',
      required: true,
    }),
    reportTitle: Property.ShortText({
      displayName: 'Report Title',
      description: 'Title for the summary report.',
      required: false,
      defaultValue: 'Campaign Import Review Summary',
    }),
  },
  async run({ propsValue }) {
    const results = propsValue.reviewResults as ReviewResult[];

    if (!Array.isArray(results)) {
      throw new Error('Review results must be an array');
    }

    // Calculate summary statistics
    let totalSets = results.length;
    let autoApproved = 0;
    let autoRejected = 0;
    let manualReview = 0;
    let totalContacts = 0;
    let totalEnriched = 0;
    let totalScore = 0;

    const autoApprovedList: ReviewResult[] = [];
    const autoRejectedList: ReviewResult[] = [];
    const manualReviewList: ReviewResult[] = [];

    for (const result of results) {
      totalContacts += result.totalContacts || 0;
      totalEnriched += result.enrichedContacts || 0;
      totalScore += result.score || 0;

      if (result.decision === 'auto_approved') {
        autoApproved++;
        autoApprovedList.push(result);
      } else if (result.decision === 'auto_rejected') {
        autoRejected++;
        autoRejectedList.push(result);
      } else {
        manualReview++;
        manualReviewList.push(result);
      }
    }

    const avgScore = totalSets > 0 ? Math.round((totalScore / totalSets) * 10) / 10 : 0;
    const overallEnrichmentRate =
      totalContacts > 0 ? Math.round((totalEnriched / totalContacts) * 100) : 0;

    // Build Slack summary
    const slackParts: string[] = [];
    slackParts.push(`*${propsValue.reportTitle}*`);
    slackParts.push('');
    slackParts.push('*Overview:*');
    slackParts.push(`• Total Contact Sets: ${totalSets}`);
    slackParts.push(`• Total Contacts: ${totalContacts}`);
    slackParts.push(`• Overall Enrichment Rate: ${overallEnrichmentRate}%`);
    slackParts.push(`• Average Score: ${avgScore}/10`);
    slackParts.push('');
    slackParts.push('*Decisions:*');
    slackParts.push(
      `:white_check_mark: Auto-Approved: ${autoApproved} (${Math.round((autoApproved / totalSets) * 100)}%)`
    );
    slackParts.push(
      `:x: Auto-Rejected: ${autoRejected} (${Math.round((autoRejected / totalSets) * 100)}%)`
    );
    slackParts.push(
      `:warning: Needs Manual Review: ${manualReview} (${Math.round((manualReview / totalSets) * 100)}%)`
    );

    if (manualReviewList.length > 0) {
      slackParts.push('');
      slackParts.push('*Sequences Requiring Manual Review:*');
      manualReviewList.forEach((r) => {
        const name = r.sequenceName || r.sequenceId || 'Unknown';
        slackParts.push(`• ${name} - Score: ${r.score}/10`);
      });
    }

    // Build Linear summary
    const linearParts: string[] = [];
    linearParts.push(`# ${propsValue.reportTitle}`);
    linearParts.push('');
    linearParts.push('## Overview');
    linearParts.push(`- **Total Contact Sets:** ${totalSets}`);
    linearParts.push(`- **Total Contacts:** ${totalContacts}`);
    linearParts.push(`- **Overall Enrichment Rate:** ${overallEnrichmentRate}%`);
    linearParts.push(`- **Average Score:** ${avgScore}/10`);
    linearParts.push('');
    linearParts.push('## Decision Breakdown');
    linearParts.push('| Decision | Count | Percentage |');
    linearParts.push('|----------|-------|------------|');
    linearParts.push(
      `| Auto-Approved | ${autoApproved} | ${Math.round((autoApproved / totalSets) * 100)}% |`
    );
    linearParts.push(
      `| Auto-Rejected | ${autoRejected} | ${Math.round((autoRejected / totalSets) * 100)}% |`
    );
    linearParts.push(
      `| Manual Review | ${manualReview} | ${Math.round((manualReview / totalSets) * 100)}% |`
    );

    if (manualReviewList.length > 0) {
      linearParts.push('');
      linearParts.push('## Sequences Requiring Manual Review');
      linearParts.push('| Sequence | Score | Enrichment Rate |');
      linearParts.push('|----------|-------|-----------------|');
      manualReviewList.forEach((r) => {
        const name = r.sequenceName || r.sequenceId || 'Unknown';
        linearParts.push(
          `| ${name} | ${r.score}/10 | ${Math.round(r.enrichmentRate * 100)}% |`
        );
      });
    }

    return {
      // Summary stats
      totalSets,
      totalContacts,
      totalEnriched,
      overallEnrichmentRate,
      avgScore,

      // Counts
      autoApprovedCount: autoApproved,
      autoRejectedCount: autoRejected,
      manualReviewCount: manualReview,

      // Lists
      autoApprovedList,
      autoRejectedList,
      manualReviewList,

      // Formatted outputs
      slackMessage: slackParts.join('\n'),
      linearDescription: linearParts.join('\n'),
      linearTitle: `${propsValue.reportTitle} - ${manualReview} need review`,

      // Helpers for conditional logic
      hasManualReviewItems: manualReview > 0,
      allAutoProcessed: manualReview === 0,
      timeSavedPercent: Math.round(((autoApproved + autoRejected) / totalSets) * 100),
    };
  },
});
