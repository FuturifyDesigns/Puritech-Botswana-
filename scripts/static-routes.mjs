import fs from 'node:fs/promises';
import path from 'node:path';
import { articles, solutionPages } from '../src/pages.js';

const root = path.resolve('dist');
const html = await fs.readFile(path.join(root, 'index.html'));
const routes = new Set([
  'home', 'about', 'contact', 'products', 'solutions', 'ro-range', 'journal', 'offers', 'editor',
  ...solutionPages.map(page => page.slug),
  ...articles.map(article => `journal/${article.slug}`)
]);

try {
  const response = await fetch('https://azvpkkxbtnbbgpyvzbuw.supabase.co/rest/v1/products?select=id&active=eq.true&limit=1000', {
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error(`catalogue returned ${response.status}`);
  for (const product of await response.json()) {
    if (/^[0-9a-f-]{36}$/i.test(product.id)) routes.add(`product/${product.id}`);
  }
} catch (error) {
  console.log(`Product route generation skipped: ${error.message}. The 404 fallback will serve new products.`);
}

for (const route of routes) {
  if (!/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(route)) continue;
  const directory = path.join(root, route);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), html);
}
await fs.writeFile(path.join(root, '404.html'), html);
console.log(`Generated ${routes.size} clean URL entry points.`);
