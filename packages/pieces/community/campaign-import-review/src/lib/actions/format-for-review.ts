import { createAction, Property } from '@activepieces/pieces-framework';

export const formatForReview = createAction({
  name: 'format_for_review',
  displayName: 'Format for Manual Review',
  description:
    'Formats contact set review data for Slack notifications and Linear issues. Use with Slack "Request Approval" and Linear "Create Issue" actions.',
  props: {
    reviewResult: Property.Json({
      displayName: 'Review Result',
      description: 'The result from the "Auto-Review Contact Set" action.',
      required: true,
    }),
    includeDetails: Property.Checkbox({
      displayName: 'Include Detailed Metrics',
      description: 'Include detailed validation rates in the formatted output.',
      required: false,
      defaultValue: true,
    }),
    customMessage: Property.LongText({
      displayName: 'Custom Message',
      description: 'Optional custom message to prepend to the review notification.',
      required: false,
    }),
    reviewerMention: Property.ShortText({
      displayName: 'Reviewer Mention',
      description:
        'Slack user ID or handle to mention (e.g., @serhii or <@U057AT36HSN>). Leave empty for no mention.',
      required: false,
    }),
  },
  async run({ propsValue }) {
    const reviewResult = propsValue.reviewResult as Record<string, unknown>;

    if (!reviewResult) {
      throw new Error('Review result is required');
    }

    const sequenceId = reviewResult.sequenceId as string | undefined;
    const sequenceName = reviewResult.sequenceName as string | undefined;
    const decision = reviewResult.decision as string;
    const score = reviewResult.score as number;
    const totalContacts = reviewResult.totalContacts as number;
    const enrichedContacts = reviewResult.enrichedContacts as number;
    const enrichmentRate = reviewResult.enrichmentRate as number;
    const validEmails = reviewResult.validEmails as number;
    const validPhones = reviewResult.validPhones as number;
    const hasCompanyData = reviewResult.hasCompanyData as number;
    const hasTitleData = reviewResult.hasTitleData as number;
    const reasons = reviewResult.reasons as string[];
    const details = reviewResult.details as Record<string, number> | undefined;

    // Format decision badge
    const decisionEmoji =
      decision === 'auto_approved'
        ? ':white_check_mark:'
        : decision === 'auto_rejected'
          ? ':x:'
          : ':warning:';

    const decisionText =
      decision === 'auto_approved'
        ? 'AUTO APPROVED'
        : decision === 'auto_rejected'
          ? 'AUTO REJECTED'
          : 'NEEDS MANUAL REVIEW';

    // Build Slack message (mrkdwn format)
    const slackParts: string[] = [];

    if (propsValue.customMessage) {
      slackParts.push(propsValue.customMessage);
      slackParts.push('');
    }

    if (propsValue.reviewerMention) {
      slackParts.push(`${propsValue.reviewerMention} - Review needed!`);
      slackParts.push('');
    }

    slackParts.push(`${decisionEmoji} *Campaign Import Review: ${decisionText}*`);
    slackParts.push('');

    if (sequenceName || sequenceId) {
      slackParts.push(`*Sequence:* ${sequenceName || sequenceId}`);
    }

    slackParts.push(`*Quality Score:* ${score}/10`);
    slackParts.push(
      `*Enrichment:* ${enrichedContacts}/${totalContacts} contacts (${Math.round(enrichmentRate * 100)}%)`
    );
    slackParts.push('');
    slackParts.push('*Contact Data Quality:*');
    slackParts.push(`• Valid Emails: ${validEmails}/${totalContacts}`);
    slackParts.push(`• Valid Phones: ${validPhones}/${totalContacts}`);
    slackParts.push(`• Has Company: ${hasCompanyData}/${totalContacts}`);
    slackParts.push(`• Has Title: ${hasTitleData}/${totalContacts}`);

    if (propsValue.includeDetails && details) {
      slackParts.push('');
      slackParts.push('*Validation Rates:*');
      slackParts.push(
        `• Email: ${Math.round((details.emailValidationRate || 0) * 100)}%`
      );
      slackParts.push(
        `• Phone: ${Math.round((details.phoneValidationRate || 0) * 100)}%`
      );
      slackParts.push(
        `• Company: ${Math.round((details.companyDataRate || 0) * 100)}%`
      );
      slackParts.push(`• Title: ${Math.round((details.titleDataRate || 0) * 100)}%`);
    }

    if (reasons && reasons.length > 0) {
      slackParts.push('');
      slackParts.push('*Flags/Reasons:*');
      reasons.forEach((reason) => {
        slackParts.push(`• ${reason}`);
      });
    }

    // Build Linear issue description (markdown format)
    const linearParts: string[] = [];

    linearParts.push(`## Campaign Import Review: ${decisionText}`);
    linearParts.push('');

    if (sequenceName || sequenceId) {
      linearParts.push(`**Sequence:** ${sequenceName || sequenceId}`);
      linearParts.push('');
    }

    linearParts.push('### Summary');
    linearParts.push(`- **Quality Score:** ${score}/10`);
    linearParts.push(
      `- **Enrichment Rate:** ${enrichedContacts}/${totalContacts} (${Math.round(enrichmentRate * 100)}%)`
    );
    linearParts.push(`- **Decision:** ${decisionText}`);
    linearParts.push('');

    linearParts.push('### Contact Data Quality');
    linearParts.push(`| Metric | Count | Total |`);
    linearParts.push(`|--------|-------|-------|`);
    linearParts.push(`| Valid Emails | ${validEmails} | ${totalContacts} |`);
    linearParts.push(`| Valid Phones | ${validPhones} | ${totalContacts} |`);
    linearParts.push(`| Has Company | ${hasCompanyData} | ${totalContacts} |`);
    linearParts.push(`| Has Title | ${hasTitleData} | ${totalContacts} |`);

    if (reasons && reasons.length > 0) {
      linearParts.push('');
      linearParts.push('### Flags/Issues');
      reasons.forEach((reason) => {
        linearParts.push(`- ${reason}`);
      });
    }

    // Generate Linear issue title
    const linearTitle = sequenceName || sequenceId
      ? `[Campaign Review] ${sequenceName || sequenceId} - Score: ${score}/10`
      : `[Campaign Review] Score: ${score}/10 - ${decisionText}`;

    return {
      // For Slack
      slackMessage: slackParts.join('\n'),
      slackBlocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: slackParts.join('\n'),
          },
        },
      ],

      // For Linear
      linearTitle,
      linearDescription: linearParts.join('\n'),

      // Pass through data for conditional logic
      decision,
      isAutoApproved: decision === 'auto_approved',
      isAutoRejected: decision === 'auto_rejected',
      requiresManualReview: decision === 'manual_review',
      score,
      sequenceId,
      sequenceName,
      enrichmentRate,
    };
  },
});
