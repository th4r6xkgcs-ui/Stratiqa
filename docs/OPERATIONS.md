# STRATIQA Operations

## Runtime endpoints

- `/api/health` reports provider-level health, latency, mode, failures, and stale state.
- `/api/ready` reports whether the application can safely receive traffic.
- Both endpoints disable response caching.

## Required production configuration

Copy `.env.example` into the target platform's secret manager. Run `npm run verify:env` before release. Production requires:

- `NEXT_PUBLIC_APP_URL` using HTTPS
- `STRATIQA_SESSION_SECRET` with at least 32 random characters
- `STRATIQA_PROVIDER_MODE` set to `mock` or `live`
- `STRATIQA_ODDS_API_KEY` when live mode is enabled

Never commit environment values.

## Observability

Server events are emitted as single-line JSON with timestamp, level, service, event, request ID, and safe contextual fields. The `ErrorMonitor` interface is the boundary for a hosted monitoring vendor. Do not log credentials, session cookies, prompts containing personal data, or complete provider payloads.

## Scaling notes

Provider cache and rate limiting currently use process memory. Before running multiple replicas, replace `RateLimiter` and provider cache storage with a shared low-latency store. User preferences also require a persistent production repository.

## Service levels

- Readiness must return HTTP 200 before the load balancer sends traffic.
- Provider degradation may serve bounded stale data and remains visible in product.
- Unavailable providers cause readiness failure only when no safe fallback exists.
