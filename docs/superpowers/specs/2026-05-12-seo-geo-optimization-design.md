# SEO/GEO Optimization — Design Spec

**Date:** 2026-05-12
**Status:** Approved
**Scope:** Add discoverability surface (robots/sitemap/llms/schema/metadata) without touching visible content, design, or the existing iMessage share preview.

## Goal

Make `romoloscannoli.com` legible to:

1. **Search engines** (Google, Bing) — via robots.txt, sitemap.xml, JSON-LD `LocalBusiness`/`WebSite`, OpenGraph/Twitter cards, canonical URLs.
2. **AI search & agents** (ChatGPT, Perplexity, Claude, Google AI Overviews) — via `llms.txt`, structured data, and explicit AI-crawler allowlist.

Zero changes to:
- Visible page content or copy (excepting the `<title>` tag — which is a SERP/tab string, not body content)
- Layout, CSS, or component design
- The current link-share preview on iMessage (no `og:image` override)

## Non-goals

- Per-item `Menu` schema (Square data is dynamic; lying with stale items is worse than no schema)
- `SearchAction` (no on-site search exists)
- PWA manifest, image-asset optimization, image alt-text rewrites
- New visible content of any kind

## Architecture

```
src/
├── app/
│   ├── robots.ts                 NEW
│   ├── sitemap.ts                NEW
│   ├── layout.tsx                MOD: metadata object only
│   ├── page.tsx                  MOD: inject LocalBusiness + WebSite JSON-LD
│   ├── privacy/page.tsx          MOD: inject BreadcrumbList + canonical
│   └── terms/page.tsx            MOD: inject BreadcrumbList + canonical
├── lib/seo/
│   ├── site.ts                   NEW: SITE_URL, BUSINESS constants
│   ├── schema.ts                 NEW: pure builders → JSON-LD objects
│   ├── schema.test.ts            NEW: vitest unit tests
│   └── JsonLd.tsx                NEW: <script type="application/ld+json"> wrapper
public/
└── llms.txt                      NEW
```

`src/lib/seo/site.ts` is the single source of truth for business facts (NAP, hours, socials, geo). Anything that needs them imports from there.

## Component contracts

### `site.ts`

Exports `SITE_URL` (env-aware) and a frozen `BUSINESS` constant covering:
- legalName, alternateName, slogan
- streetAddress, addressLocality, addressRegion, postalCode, addressCountry
- telephone (E.164), email
- latitude, longitude (`37.5302, -122.3047` — verified via Nominatim)
- openingHours array (Tue–Sat 11–18, Sun 12–16)
- sameAs (Instagram, Facebook)
- servesCuisine, priceRange, areaServed
- heroImageUrl (absolute Cloudinary URL, current hero shot)
- logoUrl (`${SITE_URL}/RmLogo.png`)

### `schema.ts`

Pure functions, no I/O:

- `buildLocalBusinessSchema(input)` — accepts an optional `ReviewsBundle` and returns the LocalBusiness JSON-LD object. Conditionally attaches `aggregateRating` from combined Google + Yelp totals (weighted average). Omits the field if both sources are missing.
- `buildWebSiteSchema()` — returns a `WebSite` object with `publisher` referencing `#business` via stable `@id`.
- `buildBreadcrumbSchema(items)` — returns a `BreadcrumbList` object.

Stable `@id` values: `${SITE_URL}/#business`, `${SITE_URL}/#website` — lets AI engines deduplicate entities across pages.

### `JsonLd.tsx`

Server component that renders a single `<script type="application/ld+json">` tag containing the stringified schema. Accepts one object or an array. Standard Next.js JSON-LD pattern — input is always the output of our schema builders (no user-supplied data path).

### `robots.ts`

```ts
export default function robots(): MetadataRoute.Robots
```

- `allow: "/"` for `*`
- `disallow: ["/api/", "/alternativedesigns/", "/_next/"]` for `*`
- Explicit allow entries for: `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Google-Extended`, `ClaudeBot`, `Applebot-Extended`
- `sitemap: "${SITE_URL}/sitemap.xml"`
- `host: SITE_URL`

### `sitemap.ts`

Three URLs only: `/`, `/privacy`, `/terms`. `lastModified: new Date()`. Home priority 1.0/weekly; legal 0.3/yearly.

### `layout.tsx` metadata block

Adds: `metadataBase`, `title.template`, `keywords`, `alternates.canonical`, `openGraph` (no `images`), `twitter` (no `images`), `robots` directive with `googleBot: { max-image-preview: "large", max-snippet: -1 }`.

Title default updated to include "in San Mateo" for local intent. Body content unchanged.

### Page-level JSON-LD injection

- `page.tsx` (home): renders `<JsonLd data={[localBusiness, website]} />` once, outside `<main>`. Passes `reviews` bundle through so aggregate rating is live.
- `privacy/page.tsx` and `terms/page.tsx`: each renders `<JsonLd data={breadcrumb} />` and adds `alternates.canonical` to its metadata.

### `llms.txt`

Static file at `public/llms.txt`. Follows llmstxt.org spec: H1 title, blockquote tagline, narrative paragraph, then sections (About, Menu & Ordering, Location & Hours, Reviews, Social, Legal) with bulleted absolute-URL links. ~40 lines. Content matches the body of the home page; no claims that aren't already on the site.

## Data flow for aggregateRating

`page.tsx` already calls `getReviews()` → `ReviewsBundle`. Pass the bundle to `buildLocalBusinessSchema({ reviews })`. The builder weights Google and Yelp ratings by their review counts, rounds to 1 decimal, and emits an `AggregateRating` object. If both totals are zero, the field is omitted entirely.

Visible reviews are still rendered on `/#testimonials`, satisfying Google's "rating must be visible on the page" requirement.

## Environment

`NEXT_PUBLIC_SITE_URL` — used as canonical base. Default fallback in `site.ts` is `https://romoloscannoli.com`. No deploy changes needed.

## Testing strategy

- **vitest** unit tests for `schema.ts` builders:
  - LocalBusiness shape with and without reviews
  - aggregateRating math: only-google, only-yelp, both, neither
  - Breadcrumb construction
- Trust Next.js for robots/sitemap output (typed APIs).
- Manual post-deploy checklist:
  1. `curl -s romoloscannoli.com/robots.txt`
  2. `curl -s romoloscannoli.com/sitemap.xml`
  3. `curl -s romoloscannoli.com/llms.txt`
  4. View source on `/`, confirm 2 JSON-LD script tags
  5. Validate at https://validator.schema.org and Google Rich Results Test
  6. Share URL on iMessage, confirm preview unchanged
  7. Lighthouse SEO score should jump (baseline check)

## Security note

JSON-LD injection uses React's raw-HTML escape hatch because that's the only way to render a `<script>` body without React escaping the JSON. Input is always the output of our own typed schema builders — no user-supplied or third-party HTML touches it. The rating numbers from `getReviews()` are numbers (typed), and any string fields go through `JSON.stringify`, which safely escapes embedded `<`, `>`, and `"` characters in JSON-LD context.

## Risk & rollback

- Lowest-risk file: `public/llms.txt` (pure static, ignorable by anything).
- Highest-risk file: `layout.tsx` metadata change — a typo could break OpenGraph fields project-wide. Mitigation: keep diff minimal, retain existing keys verbatim.
- Rollback: each piece is independent. Revert the offending commit; no migrations.

## Open questions resolved

- **Prod domain:** romoloscannoli.com (apex, HTTPS)
- **Internal route:** `/alternativedesigns` excluded
- **Business type:** `["FoodEstablishment", "Bakery"]`
- **OG image:** not set (preserves current iMessage preview)
- **Aggregate rating:** live, weighted across Google + Yelp
