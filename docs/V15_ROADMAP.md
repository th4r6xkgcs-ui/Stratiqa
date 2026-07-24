# STRATIQA V15 Roadmap

## Audit baseline

- V14.2 is preserved at `v14.2-premium-ui` and PR #1.
- The app builds and lints, but had no explicit typecheck or test command.
- Product data was embedded directly in presentation components.
- AI Coach was a static dashboard card without a dedicated workflow or server boundary.
- Mobile navigation existed, while dense workflows still needed task-specific responsive treatment.

## V15.0 — AI Coach and data foundation

This milestone creates the production seam without requiring vendor credentials:

- typed intelligence/odds domain contracts
- server-only adapter selection with a deterministic mock fallback
- validated Coach route handler with safe error responses
- dedicated responsive Coach workspace with suggested prompts and data provenance
- automated lint, typecheck, unit-test, and build commands

Live credentials are intentionally not committed. `STRATIQA_DATA_PROVIDER` defaults to `mock`; a credentialed adapter can replace it without changing UI consumers.

## Staged milestones

1. **V15.1 — Props and EV Lab:** normalized sportsbook quotes, implied-probability and no-vig calculations, line comparison, filters, sortable EV board, and detail views.
2. **V15.2 — Live data adapters:** provider-specific odds and sports-data adapters, caching, retry/backoff, stale-data policy, health telemetry, and contract tests.
3. **V15.3 — Acquisition:** premium public landing page, onboarding, preference capture, responsible-use messaging, authentication handoff, and activation analytics.
4. **V15.4 — Mobile and motion:** phone-first navigation and card hierarchy, reduced-motion support, confidence/odds micro-interactions, and performance budgets.
5. **V15.5 — Release readiness:** browser journeys, accessibility audit, observability, security headers, environment validation, deployment previews, rollback notes, and release checklist.

## V15.0 acceptance criteria

- No changes are committed to the stable V14.2 branch.
- Coach requests are validated and answered through a server route.
- UI labels representative data clearly and never implies it is live.
- Provider secrets cannot enter the client bundle.
- Lint, typecheck, unit tests, and production build pass.
