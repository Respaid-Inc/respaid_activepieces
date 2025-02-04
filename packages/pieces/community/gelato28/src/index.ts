
import { createPiece, PieceAuth } from "@activepieces/pieces-framework";
import { getIcecreamFlavor } from './lib/actions/get-ice-cream-flavor';
import { newFlavorCreated } from './lib/triggers/new-flavor-created';



export const gelatoAuth = PieceAuth.SecretText({
  displayName: 'API Key',
  required: true,
  description: 'Please use **test-key** as value for API Key',
});

    
export const gelato28 = createPiece({
  displayName: "Gelato28",
  auth: gelatoAuth,
  minimumSupportedRelease: '0.36.1',
  logoUrl: "https://cdn.activepieces.com/pieces/gelato28.png",
  authors: [],
  actions: [getIcecreamFlavor], 
  triggers: [newFlavorCreated],
});
    