# Release Checklist

## Before release

- [ ] Merge only after GitHub Actions passes.
- [ ] Review dependency changes and run `npm audit --omit=dev` in a networked environment.
- [ ] Run `npm run verify:env` with production configuration.
- [ ] Run `npm run check`.
- [ ] Confirm `/api/ready` returns 200.
- [ ] Confirm provider mode and fallback state in `/api/health`.
- [ ] Verify landing, onboarding, account, Coach, Props, and all matchup reports.
- [ ] Verify keyboard navigation, focus visibility, reduced motion, and mobile layouts.
- [ ] Confirm session cookies are Secure, HTTP-only, SameSite=Lax, and expiring.
- [ ] Confirm secrets exist only in the deployment secret manager.

## Release

- [ ] Build the standalone container from the committed SHA.
- [ ] Deploy an immutable image tag to preview.
- [ ] Run smoke tests against preview.
- [ ] Promote the same image to production.
- [ ] Monitor readiness, errors, latency, and provider degradation.

## After release

- [ ] Confirm sitemap and robots endpoints.
- [ ] Confirm the social-preview image resolves from the production host.
- [ ] Confirm login throttling and authenticated preferences.
- [ ] Confirm strategy builds and tracked picks synchronize across authenticated sessions.
- [ ] Record the deployed SHA and previous known-good image.
