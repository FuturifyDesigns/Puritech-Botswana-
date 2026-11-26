# Puritech Botswana

React/Vite redesign for [water.co.bw](https://water.co.bw/) hosted at [GitHub Pages](https://futurifydesigns.github.io/Puritech-Botswana-/). This is an **enquiry website**: there is no cart or checkout. The enquiry form opens the visitor's email application with a prepared message; the visitor must press **Send** there.

## Run locally

```bash
npm install
npm run dev
```

The Supabase URL and publishable key in `src/supabase.js` are public client configuration. Never place a personal access token, service role key, or database password in the browser bundle or repository.

## Activate live editing

1. In Supabase project `azvpkkxbtnbbgpyvzbuw`, run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor. This creates content tables, row level security policies, and the image upload bucket.
2. In Supabase Authentication, create or invite an editor user. Find their UUID under **Authentication  Users**.
3. In the SQL Editor, run `insert into public.editors (user_id) values ('EDITOR-USER-UUID');` with the real UUID. Do not make public sign-up an editor path.
4. Open the website, select **Editor sign in**, and sign in. The live page shows pencil buttons for text and images, plus product and promotion controls. Images and flyers are uploaded as files to Supabase Storage.

The website falls back to selected source products and page copy while the CMS tables are unavailable. Changes cannot publish until the schema and editor membership are installed. To make starter products editable, create them as CMS records; the fallback list is replaced once the database contains products.

## Catalogue migration status

On 26 November 2026, **499 products** from all 34 public shop pages were imported into Supabase with distinct original product URLs and image URLs. The 16 preliminary CMS entries were archived, leaving exactly 499 active products. The catalogue reads from Supabase and shows 24 cards at a time, with search and categories derived from current product data.

The public listing supplies a short excerpt for each item, not the full WooCommerce product record. Import the WooCommerce CSV later to reconcile long descriptions, variations, and other metadata. The image URLs currently point to the original WordPress media files; upload those files to Supabase Storage if the old site will be retired. `src/data.js` remains a small offline fallback if Supabase is unavailable.
## Publishing

The `.github/workflows/pages.yml` action builds `dist` on each push to `main` and deploys via GitHub Pages. In repository settings, set **Pages  Build and deployment  Source** to **GitHub Actions**. Then rerun the workflow if the first deployment happened before that setting was enabled. The Vite base path is set to `/Puritech-Botswana-/`.

## Content and enquiry behavior

Home, Products, About, and Contact use hash routes so direct navigation works on GitHub Pages. Public contact details and company history were sourced from water.co.bw. Promotions are uploaded and managed in the live editor. Enquiry messages go to `info@water.co.bw` through `mailto:`. A mail application must be installed or configured on the visitor's device; this flow does not provide server-confirmed delivery.
