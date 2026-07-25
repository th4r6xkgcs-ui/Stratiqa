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

1. **V15.1 — AI Coach Intelligence & Live Data Foundation (complete):** conversational Coach, provider service contracts, full matchup intelligence, Props Lab, shared reasoning components, responsive premium states, and performance/accessibility foundations.
2. **V15.2 — Live Data Reliability (complete):** credential-aware environment selection, normalized no-vig/EV utilities, server caching, exponential retry, stale-data fallback, provider health telemetry, persistent Coach/Props state, and pricing contract tests.
3. **V15.3 — Provider and Identity Foundation (complete):** vendor-neutral HTTP provider base, signed HTTP-only sessions, development login adapter, user preference repository, risk profiles, rate limiting, security headers, and identity validation tests.
4. **V15.4 — Acquisition (complete):** premium public landing page, founding membership presentation, five-step onboarding, local preference capture, responsible-use acknowledgement, SEO metadata, sitemap, robots policy, and branded social preview.
5. **V15.5 — Release Readiness (complete):** standalone container packaging, environment validation, strict security policy, readiness diagnostics, request tracing, structured logs, monitoring and rate-limit boundaries, resilient error states, release checklist, operations guide, and rollback plan.

## V15.0 acceptance criteria

- No changes are committed to the stable V14.2 branch.
- Coach requests are validated and answered through a server route.
- UI labels representative data clearly and never implies it is live.
- Provider secrets cannot enter the client bundle.
- Lint, typecheck, unit tests, and production build pass.
