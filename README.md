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
2. In Supabase Authentication, create or invite an editor user. Find their UUID under **Authentication → Users**.
3. In the SQL Editor, run `insert into public.editors (user_id) values ('EDITOR-USER-UUID');` with the real UUID. Do not make public sign-up an editor path.
4. Open the website, select **Editor sign in**, and sign in. The live page shows pencil buttons for text and images, plus product and promotion controls. Images and flyers are uploaded as files to Supabase Storage.

The website falls back to selected source products and page copy while the CMS tables are unavailable. Changes cannot publish until the schema and editor membership are installed. To make starter products editable, create them as CMS records; the fallback list is replaced once the database contains products.

## Catalogue migration status

The original shop reported **499 products** when inspected. The public site rate limited automated access and no WooCommerce export was available. This repository therefore contains a selected starter list drawn from its publicly indexed pages, **not a completed 499-product migration**. The matching product imagery currently used for some cards comes from the Puritech South African catalogue because original image files were inaccessible; replace these with the Botswana originals when an export or media access is available. Products without verified imagery show a neutral placeholder.

For the complete transfer, export **Products → Export** from WooCommerce with all columns and image URLs, and export the WordPress media library or provide working admin access. Reconcile names, descriptions, categories, variants and original image files before importing the full catalogue. Keep `source_url` for traceability.

## Publishing

The `.github/workflows/pages.yml` action builds `dist` on each push to `main` and deploys via GitHub Pages. In repository settings, set **Pages → Build and deployment → Source** to **GitHub Actions**. Then rerun the workflow if the first deployment happened before that setting was enabled. The Vite base path is set to `/Puritech-Botswana-/`.

## Content and enquiry behavior

Home, Products, About, and Contact use hash routes so direct navigation works on GitHub Pages. Public contact details and company history were sourced from water.co.bw. Promotions are uploaded and managed in the live editor. Enquiry messages go to `info@water.co.bw` through `mailto:`. A mail application must be installed or configured on the visitor's device; this flow does not provide server-confirmed delivery.
