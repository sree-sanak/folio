# Changelog

All notable changes to Folio will be documented in this file.

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
