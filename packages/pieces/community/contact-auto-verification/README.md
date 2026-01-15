# Contact Auto-Verification Piece

Automates the verification of enriched contacts after campaign import, reducing manual review workload.

## Overview

This piece implements an auto-verification system that:
- **Auto-verifies** contacts with overall score >= 7 (configurable)
- **Red-flags** contacts with scores 4-7 that have concerning issues for manual review
- **Auto-skips** contacts with scores < 4 (configurable)

## Actions

### Auto-Verify Contacts
Process a batch of enriched contacts and categorize them based on scores and filtering rules.

**Outputs:**
- `autoVerifiedContacts` - Contacts that passed all checks
- `redFlaggedContacts` - Contacts needing manual review
- `skippedContacts` - Contacts that were auto-rejected

### Evaluate Single Contact
Evaluate one enriched contact against a primary contact.

### Filter Contacts (Pre-LLM)
Apply basic filtering rules before LLM evaluation:
- Score threshold (default: >= 7)
- Email required
- Domain matching
- Partial domain match exclusion
- Irrelevant title filtering
- Executive/finance title prioritization

### Generate Slack Notification
Create formatted Slack messages for red-flagged contacts.

## Red-Flag Conditions

Contacts are flagged for manual review when:
- `domain_name` score < 6 (possible company mismatch)
- `company_name` score < 5 (wrong company)
- `location` score = 0 (wrong country)
- Email domain doesn't match primary contact
- Using non-corporate email (gmail, yahoo, etc.)

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Auto-Verify Threshold | 7.0 | Score to auto-approve |
| Min Score Threshold | 4.0 | Score below which to skip |
| Max Auto-Verified | 3 | Max contacts per sequence |
| Domain Score Threshold | 6.0 | Domain score red-flag trigger |
| Company Score Threshold | 5.0 | Company score red-flag trigger |

## Usage in Flows

1. **After enrichment:** Use "Filter Contacts" to apply pre-filtering
2. **Process results:** Use "Auto-Verify Contacts" to categorize
3. **Notify:** Use "Generate Slack Notification" if there are red-flagged contacts
4. **Send:** Use Slack "Send Message" action with the generated message
