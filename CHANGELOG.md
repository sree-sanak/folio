# Changelog

All notable changes to Folio will be documented in this file.

## [0.3.0.0] - 2026-04-04

### Added
- Virtual Visa debit card issuing via Lithic API (sandbox + mock mode)
- Card result screen with full PAN, CVV (tap to reveal), expiry, and balance display
- Cards section in nav with history of issued cards
- Lithic integration with mock mode for demo without API key

### Changed
- Spend flow rewritten: "Get Card" replaces "Send Payment" as primary action
- "Loan" terminology softened to "advance" across all UI (SpendFlow, Confirmation, NoteDetail)
- "Repay" → "Settle", "Loan Summary" → "Advance Summary", "Protected until" replaces "Repay by"
- Duration hardcoded to 1 month for card flow (removed duration picker)
- Nav labels: "Send" → "Spend"

### Removed
- Bitrefill gift card integration (replaced by Lithic virtual cards)
- Brand picker component (universal Visa card, no brand selection needed)
- Recipient selector from spend flow (card flow is self-serve)

## [0.2.0.2] - 2026-04-04

### Fixed
- "Connect Brokerage" button was hidden when showing demo holdings, making it impossible to link a real Plaid account

## [0.2.0.1] - 2026-04-04

### Fixed
- Login screen now uses the app's green accent design system (was gray `bg-white/10`)
- Added Folio "F" logo icon to login card to match sidebar branding
- CollarGraph now shows the correct stock name instead of hardcoded "Tesla"

## [0.2.0.0] - 2026-04-04

### Changed
- Auth flow is now email-only — no wallet connectors, no crypto language
- Dynamic SDK modal styled to match neobank design system (dark theme, emerald accent, Inter font)
- Login button says "Sign in" instead of "Connect"
- Auth guard copy updated to "Sign in with your email to continue"

### Removed
- `@dynamic-labs/ethereum` wallet connector dependency
