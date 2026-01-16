# Claude Slack Auto-Response Use Cases

This document tracks the use cases where Claude should automatically respond to Slack messages without being explicitly mentioned.

## Use Cases

### 1. Transaction Verification
**Trigger pattern**: Someone asks if a transaction/expense is recognized or legitimate

**Example conversation**:
```
User A: Tu reconnais cette transaction @UserB ?
        [attachment showing $799 USD charge from "ENGROSS DIGITAL MARKETING"]
User B: @Claude check mes mails et tout
```

**What Claude should do**:
- Search through emails to find context about the transaction
- Look for related conversations, invoices, or approvals
- Respond with confirmation and supporting details (vendor name, date, context of approval)

**Auto-response criteria**:
- Message contains keywords like: "transaction", "reconnais", "recognize", "expense", "payment", "charge"
- Combined with question patterns: "tu reconnais", "do you recognize", "is this legitimate", "c'est quoi"
- Particularly when there's a financial amount mentioned (e.g., $XXX, XXX USD, XXX EUR)

**Note**: In the example above, Claude was explicitly mentioned (@Claude), so it was not an auto-response. However, this use case suggests Claude COULD proactively offer to help when detecting such transaction verification requests in channels where it has email/financial data access.

---

## How to Add New Use Cases

1. Add a new section with a clear title
2. Provide the trigger pattern (what keywords/patterns should trigger the response)
3. Include a real example conversation from Slack
4. Describe what Claude should do in response
5. Define clear auto-response criteria

## Implementation Notes

- Auto-responses should be helpful but not intrusive
- Claude should only auto-respond when it has high confidence it can add value
- Respect channel context and user preferences
- Avoid responding to private/sensitive discussions unless explicitly included
