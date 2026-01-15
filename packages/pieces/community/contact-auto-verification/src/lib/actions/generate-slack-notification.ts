import { createAction, Property } from '@activepieces/pieces-framework';
import {
  VerificationResult,
  VerificationStatus,
  EnrichedContact,
  RedFlagReason,
} from '../common/types';
import { generateSlackSummary } from '../common/scoring';

export const generateSlackNotificationAction = createAction({
  name: 'generate_slack_notification',
  displayName: 'Generate Slack Notification',
  description: 'Generate a formatted Slack message for red-flagged contacts that need manual review.',
  props: {
    sequenceId: Property.ShortText({
      displayName: 'Sequence ID',
      description: 'The ID of the sequence being processed',
      required: true,
    }),
    sequenceLink: Property.ShortText({
      displayName: 'Sequence Link',
      description: 'URL link to the sequence (optional, for clickable Slack links)',
      required: false,
    }),
    autoVerifiedCount: Property.Number({
      displayName: 'Auto-Verified Count',
      description: 'Number of contacts that were auto-verified',
      required: true,
      defaultValue: 0,
    }),
    redFlaggedContacts: Property.Json({
      displayName: 'Red-Flagged Contacts',
      description: 'Array of red-flagged contacts with their flags and scores',
      required: true,
      defaultValue: [],
    }),
    skippedCount: Property.Number({
      displayName: 'Skipped Count',
      description: 'Number of contacts that were auto-skipped',
      required: true,
      defaultValue: 0,
    }),
    includeDetails: Property.Checkbox({
      displayName: 'Include Contact Details',
      description: 'Include detailed information about each red-flagged contact',
      required: false,
      defaultValue: true,
    }),
    maxContactsToShow: Property.Number({
      displayName: 'Max Contacts to Show',
      description: 'Maximum number of red-flagged contacts to show in detail (default: 10)',
      required: false,
      defaultValue: 10,
    }),
  },
  async run(context) {
    const {
      sequenceId,
      sequenceLink,
      autoVerifiedCount,
      redFlaggedContacts,
      skippedCount,
      includeDetails,
      maxContactsToShow,
    } = context.propsValue;

    // Parse red-flagged contacts
    const redFlagged: Array<{ contact: EnrichedContact; flags: RedFlagReason[] }> =
      typeof redFlaggedContacts === 'string'
        ? JSON.parse(redFlaggedContacts)
        : (redFlaggedContacts as Array<{ contact: EnrichedContact; flags: RedFlagReason[] }>);

    const redFlaggedCount = redFlagged.length;

    // Build Slack message blocks
    const blocks: Array<Record<string, unknown>> = [];

    // Header
    blocks.push({
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Contact Auto-Verification Summary',
        emoji: true,
      },
    });

    // Summary section
    const summaryText = [
      `*Sequence:* ${sequenceLink ? `<${sequenceLink}|${sequenceId}>` : sequenceId}`,
      `*Auto-verified:* ${autoVerifiedCount}`,
      `*Red-flagged:* ${redFlaggedCount}`,
      `*Skipped:* ${skippedCount}`,
    ].join('\n');

    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: summaryText,
      },
    });

    // Divider
    if (includeDetails && redFlaggedCount > 0) {
      blocks.push({ type: 'divider' });

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Red-Flagged Contacts (require manual review):*',
        },
      });

      // Add each red-flagged contact
      const contactsToShow = redFlagged.slice(0, maxContactsToShow ?? 10);

      for (const item of contactsToShow) {
        const contact = item.contact;
        const flags = item.flags || [];

        const name = contact.full_name ||
          `${contact.first_name || ''} ${contact.last_name || ''}`.trim() ||
          'Unknown';
        const company = contact.company_name || contact.current_employer || 'Unknown Company';
        const title = contact.title || 'No Title';
        const email = contact.email || 'N/A';
        const score = contact.scores?.overall?.toFixed(1) || 'N/A';
        const flagsText = flags.length > 0 ? flags.join(', ') : 'threshold check';

        const contactText = [
          `*${name}* - ${title} @ ${company}`,
          `Email: ${email} | Score: ${score}`,
          `Flags: ${flagsText}`,
        ].join('\n');

        blocks.push({
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: contactText,
          },
        });
      }

      // Show if there are more contacts
      if (redFlaggedCount > (maxContactsToShow ?? 10)) {
        blocks.push({
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `_...and ${redFlaggedCount - (maxContactsToShow ?? 10)} more contacts_`,
            },
          ],
        });
      }
    }

    // Generate plain text version using the helper function
    const results: VerificationResult[] = redFlagged.map(item => ({
      contact: item.contact,
      status: VerificationStatus.RED_FLAGGED,
      action: 'manual_review' as const,
      flags: item.flags,
      summary: '',
    }));

    const plainTextMessage = generateSlackSummary(
      sequenceId,
      sequenceLink,
      results,
      autoVerifiedCount ?? 0,
      redFlaggedCount,
      skippedCount ?? 0
    );

    return {
      message: plainTextMessage,
      blocks,
      hasRedFlagged: redFlaggedCount > 0,
      redFlaggedCount,
      // For conditional branching - only send notification if there are red-flagged contacts
      shouldNotify: redFlaggedCount > 0,
    };
  },
});
