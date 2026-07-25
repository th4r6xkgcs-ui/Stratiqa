# Security Policy

Report security issues privately to the repository owner. Do not disclose credentials, session tokens, provider payloads, or personal information in public issues.

Production deployments must use HTTPS, a strong session secret, server-only provider credentials, a shared rate limiter for multiple replicas, and a persistent database with least-privilege access. Rotate credentials after suspected exposure.
