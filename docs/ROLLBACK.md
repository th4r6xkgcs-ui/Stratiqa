# Rollback Guide

1. Stop promotion if readiness, authentication, or primary navigation fails.
2. Route traffic back to the previous immutable container image.
3. Confirm `/api/ready`, `/api/health`, login, Coach, and dashboard behavior.
4. Preserve logs and the failed image for investigation.
5. Revert with a new commit; never rewrite `main` or a release branch.
6. Run the complete quality gate and deploy a new preview before re-promoting.

Provider incidents do not always require application rollback. Switch to mock mode or allow bounded stale data when the adapter contract remains healthy and the product clearly identifies degraded state.
