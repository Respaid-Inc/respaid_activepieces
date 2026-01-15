import { PieceAuth, createPiece } from '@activepieces/pieces-framework';
import { PieceCategory } from '@activepieces/shared';
import { autoVerifyContactsAction } from './lib/actions/auto-verify-contacts';
import { evaluateContactAction } from './lib/actions/evaluate-contact';
import { filterContactsAction } from './lib/actions/filter-contacts';
import { generateSlackNotificationAction } from './lib/actions/generate-slack-notification';

export const contactAutoVerification = createPiece({
  displayName: 'Contact Auto-Verification',
  description: 'Automate the verification of enriched contacts after campaign import. Applies scoring thresholds, domain matching, company matching, and title relevance rules to auto-approve, red-flag, or skip contacts.',
  minimumSupportedRelease: '0.30.0',
  logoUrl: 'https://cdn.activepieces.com/pieces/data-mapper.png', // Using data-mapper icon as placeholder
  auth: PieceAuth.None(),
  categories: [PieceCategory.CORE],
  authors: ['respaid'],
  actions: [
    autoVerifyContactsAction,
    evaluateContactAction,
    filterContactsAction,
    generateSlackNotificationAction,
  ],
  triggers: [],
});
