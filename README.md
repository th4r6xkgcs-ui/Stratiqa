This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Product Documentation

- [Product section architecture](docs/PRODUCT_SECTIONS.md)
- [V15 roadmap and V15.0 scope](docs/V15_ROADMAP.md)

## Quality gates

Run the complete local release check with:

```bash
npm run check
```

The same gate runs in GitHub Actions for pull requests and pushes to the release branches. It installs the locked dependency graph, then runs lint, strict TypeScript, unit tests, and the production build.

## Data providers

V15 uses a server-only adapter boundary. Without credentials, the app defaults to clearly labeled representative data:

```bash
STRATIQA_PROVIDER_MODE=mock
```

## Production launch checklist

For a working production app, add these variables in Vercel for **Production** and **Preview**:

```bash
NEXT_PUBLIC_APP_URL=https://your-production-domain
STRATIQA_SESSION_SECRET=<a unique secret with 32+ characters>
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<Supabase publishable key>
SUPABASE_SERVICE_ROLE_KEY=<Supabase service-role key>
```

For live odds and pregame lines, also set:

```bash
STRATIQA_PROVIDER_MODE=live
STRATIQA_ODDS_API_KEY=<The Odds API key>
```

`STRATIQA_BALLDONTLIE_API_KEY` is optional; it improves public scoreboards for supported leagues. Leave the provider mode as `mock` until the Odds API key is ready—the product will remain clearly labeled as simulation data.

Before deploying, run:

```bash
npm run verify:env
npm run check
```

After deployment, open `/api/ready`. A `200` response with `"status":"ready"` confirms configuration and provider health. The daily settlement job is already scheduled through `vercel.json`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
