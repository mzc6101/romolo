This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

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

## Square Integration

The "Start an Order" modal is wired to Square Sandbox. The site requires the
following env vars at build/run time. Set them in Railway via:

```bash
railway variables --set SQUARE_ACCESS_TOKEN=...
railway variables --set SQUARE_LOCATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_APPLICATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_LOCATION_ID=...
railway variables --set NEXT_PUBLIC_SQUARE_ENVIRONMENT=sandbox
```

| Variable | Used by | Source |
|---|---|---|
| `SQUARE_ACCESS_TOKEN` | server | Square Developer Dashboard → Sandbox → Credentials |
| `SQUARE_LOCATION_ID` | server | Square Sandbox → Locations |
| `NEXT_PUBLIC_SQUARE_APPLICATION_ID` | client | Square Developer Dashboard → App Settings |
| `NEXT_PUBLIC_SQUARE_LOCATION_ID` | client | Same value as `SQUARE_LOCATION_ID` |
| `NEXT_PUBLIC_SQUARE_ENVIRONMENT` | client | `sandbox` or `production` (selects Web Payments SDK URL) |

`NEXT_PUBLIC_*` vars are inlined into the client bundle at build time. Because
this project deploys via a Dockerfile, those vars must be declared as `ARG`
inside the `builder` stage so Railway can forward them — already wired in
`Dockerfile`. If you add new client-side env vars, declare them there too.

To flip to Production later: replace `SQUARE_ACCESS_TOKEN` and the two
`*_LOCATION_ID` vars with Production values, and set
`NEXT_PUBLIC_SQUARE_ENVIRONMENT=production`.

Catalog and inventory are revalidated every 15 minutes via Next.js
`revalidate: 900`. Sanity-check the integration after deploy via
`GET /api/health`.

## Live Reviews (Google + Yelp)

The Reviews section pulls live data from Google Places and Yelp Fusion at
request time, cached for 15 minutes. If both APIs fail or aren't configured,
the page falls back to the static reviews in `src/lib/data.ts` so it never
breaks.

| Variable | Used by | Source |
|---|---|---|
| `GOOGLE_PLACES_API_KEY` | server | Google Cloud Console → APIs & Services → Credentials (enable **Places API**) |
| `GOOGLE_PLACE_ID` | server | Find Romolo's via the Place ID Finder, e.g. https://developers.google.com/maps/documentation/places/web-service/place-id |
| `YELP_API_KEY` | server | https://www.yelp.com/developers/v3/manage_app (Fusion API key) |
| `YELP_BUSINESS_ID` | server | The slug at the end of the Yelp page URL (e.g. `romolos-cannoli-san-mateo`) |

Set them in Railway:

```bash
railway variables --set GOOGLE_PLACES_API_KEY=...
railway variables --set GOOGLE_PLACE_ID=...
railway variables --set YELP_API_KEY=...
railway variables --set YELP_BUSINESS_ID=...
```

Notes on API limits:
- Google Places returns up to 5 reviews per request.
- Yelp Fusion returns up to 3 reviews and only the first ~160 characters of each (Yelp policy).
- Both endpoints are server-side; keys are never exposed to the browser.
