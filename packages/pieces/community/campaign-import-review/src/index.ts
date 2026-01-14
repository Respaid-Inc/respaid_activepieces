import { PieceAuth, createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { scoreContactSet } from './lib/actions/score-contact-set';
import { autoReviewContacts } from './lib/actions/auto-review-contacts';
import { formatForReview } from './lib/actions/format-for-review';
import { bulkReviewSummary } from './lib/actions/bulk-review-summary';

/**
 * Campaign Import Review Piece
 *
 * Automates the review of enriched contacts for campaign imports.
 * Based on team discussion: https://respaid.slack.com/archives/C090BDAF2BX/p1768352273181369
 *
 * Key features:
 * - Score contact sets based on enrichment quality (0-10 scale)
 * - Auto-approve high quality sets (score >= 8)
 * - Auto-reject low quality sets (score < 5, or <70% enrichment rate)
 * - Flag medium quality sets for manual review
 * - Format output for Slack notifications and Linear issues
 *
 * Default thresholds (from Helmi's suggestion):
 * - Minimum enrichment rate: 70% (7/10 found contacts)
 * - Auto-approve: score >= 8
 * - Auto-reject: score < 5
 *
 * Workflow:
 * 1. Use "Score Contact Set" to calculate quality score
 * 2. Use "Auto-Review Contact Set" to make approval decision
 * 3. Use "Format for Manual Review" to format Slack/Linear notifications
 * 4. Use Slack "Request Approval" for manual review
 * 5. Use Linear "Create Issue" to track review items
 * 6. Use "Bulk Review Summary" for daily/weekly reports
 */
export const campaignImportReview = createPiece({
  displayName: 'Campaign Import Review',
  description:
    'Automate review of enriched contacts. Auto-approve quality data, flag issues for manual review. Reduces manual review time by 70%+.',

  auth: PieceAuth.None(),
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/campaign-import-review.svg',
  authors: ['respaid'],
  categories: [PieceCategory.SALES_AND_CRM, PieceCategory.PRODUCTIVITY],
  actions: [
    scoreContactSet,
    autoReviewContacts,
    formatForReview,
    bulkReviewSummary,
  ],
  triggers: [],
});
