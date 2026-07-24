# Product Section Architecture

## Purpose

STRATIQA navigation destinations must render complete, credible product experiences. Placeholder copy, empty construction states, and generic "module coming soon" pages are not acceptable.

## Route Ownership

- `src/app/[section]/page.tsx` owns the supported single-segment route contract and static generation.
- `src/components/sections/section-experience.tsx` owns the shared interactive section framework and route-specific representative data.
- `src/app/analysts/[slug]/page.tsx` owns analyst profile pages.
- Dashboard and Matchups retain dedicated route implementations because their layouts and workflows are materially distinct.

## Shared Section Contract

Each product section provides:

- a route-specific title, description, icon, and product vocabulary
- meaningful KPI metrics
- context-specific filters
- searchable representative records
- save and unsave interactions
- a route-specific model insight
- live system-health context

Legal and support routes use the same visual system but render focused editorial content rather than data tables.

## Extension Rules

1. Add new single-segment routes to the server-owned `sectionSlugs` list.
2. Add a matching configuration or legal entry in `section-experience.tsx`.
3. Prefer extending the shared table, toolbar, metric, insight, and health patterns before introducing route-specific duplication.
4. Create a dedicated route component when the feature requires a materially different workflow, data model, or information hierarchy.
5. Preserve the approved STRATIQA dark visual language and responsive behavior.
6. Run lint and a production build after route changes. The static generation pass must render every configured section.

## Current Sections

- Teams
- Players
- Props
- Community
- Friends
- Leaderboard
- Groups
- Alerts
- STRATIQA Lab
- Settings
- Privacy
- Terms
- Support
- Analyst profiles
