import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import * as cheerio from 'cheerio';
import sanitizeHtml from 'sanitize-html';
import sharp from 'sharp';
import { articles, solutionPages } from '../src/pages.js';

const base = 'Puritech-Botswana-/';
const sourceMedia = 'public/source-media';
const productMedia = 'public/product-images';
const headers = { 'User-Agent': 'Puritech-Botswana-content-migration/1.0' };
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const allowedHosts = new Set(['water.co.bw', 'reverseosmosis.co.za']);
const seen = new Map();
let consecutiveFailures = 0;
await fs.mkdir(sourceMedia, { recursive: true });
await fs.mkdir(productMedia, { recursive: true });

async function get(url, attempts = 2) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) return null;
      const response = await fetch(url, { headers, signal: AbortSignal.timeout(12000) });
      if (response.ok) { consecutiveFailures = 0; return response; }
      console.log(`${response.status} ${parsed.pathname}`);
    } catch (error) { console.log(`Fetch failed: ${url} ${error.message}`); }
    consecutiveFailures++;
    if (attempt + 1 < attempts) await sleep(4500 * (attempt + 1));
  }
  return null;
}

async function mirror(url, destination) {
  if (!url) return null;
  try {
    const parsed = new URL(url, 'https://water.co.bw/');
    if (parsed.protocol !== 'https:' || !allowedHosts.has(parsed.hostname)) return null;
    if (seen.has(parsed.href)) return seen.get(parsed.href);
    try { await fs.access(destination); seen.set(parsed.href, destination); return destination; } catch { /* Download missing file. */ }
    const response = await get(parsed.href);
    if (!response) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 15 * 1024 * 1024) return null;
    await sharp(bytes).rotate().resize(900, 900, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(destination);
    seen.set(parsed.href, destination);
    await sleep(700);
    return destination;
  } catch (error) { console.log(`Image unavailable: ${url} ${error.message}`); return null; }
}

const imported = {};
const extraPages = [
  { slug: 'about-us-2', title: 'About us', source: 'https://water.co.bw/about-us-2/' },
  { slug: 'contact-us-3', title: 'Contact us', source: 'https://water.co.bw/contact-us-3/' }
];
for (const page of [...solutionPages, ...articles, ...extraPages]) {
  const response = await get(page.source, 2);
  if (!response) continue;
  const $ = cheerio.load(await response.text());
  $('script,style,form,nav,aside,.woocommerce,.cart,.price,.related,.comments-area,.sharedaddy,.post-navigation').remove();
  let root = $('.entry-content').first();
  if (root.text().trim().length < 80) root = $('main').first();
  if (root.text().trim().length < 80) continue;
  let index = 0;
  for (const element of root.find('img').toArray()) {
    const image = $(element);
    const raw = image.attr('data-src') || image.attr('data-lazy-src') || image.attr('src');
    if (!raw || raw.startsWith('data:')) { image.remove(); continue; }
    const url = new URL(raw, page.source).href;
    const id = crypto.createHash('sha256').update(url).digest('hex').slice(0, 20);
    const local = await mirror(url, path.join(sourceMedia, `${id}.webp`));
    image.attr('src', local ? `/${base}source-media/${id}.webp` : url);
    image.attr('loading', index++ ? 'lazy' : 'eager');
    image.removeAttr('srcset').removeAttr('sizes').removeAttr('data-src').removeAttr('data-lazy-src');
  }
  root.find('a').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href');
    if (href?.startsWith('/')) anchor.attr('href', new URL(href, page.source).href);
  });
  const html = sanitizeHtml(root.html() || '', {
    allowedTags: ['h1','h2','h3','h4','h5','h6','p','br','ul','ol','li','strong','b','em','i','a','img','figure','figcaption','table','thead','tbody','tr','td','th','blockquote','hr','div','span'],
    allowedAttributes: { a: ['href','title'], img: ['src','alt','width','height','loading'], div: ['class'], span: ['class'] },
    allowedSchemes: ['https','http'],
    allowedClasses: { div: ['wp-block-*','elementor-widget-container'], span: [] }
  });
  imported[page.slug] = { title: page.title, source: page.source, html };
  console.log(`Imported ${page.slug}: ${html.length} characters`);
}
if (Object.keys(imported).length) await fs.writeFile('src/imported-pages.json', JSON.stringify(imported, null, 2) + '\n');

const key = process.env.SUPABASE_PUBLISHABLE_KEY;
if (!key) throw new Error('Missing public Supabase publishable key');
const query = 'https://azvpkkxbtnbbgpyvzbuw.supabase.co/rest/v1/products?select=id,image_url&active=eq.true&limit=1000';
const productResponse = await fetch(query, { headers: { apikey: key }, signal: AbortSignal.timeout(20000) });
if (!productResponse.ok) throw new Error(`Catalogue request failed: ${productResponse.status}`);
const products = await productResponse.json();
const manifest = JSON.parse(await fs.readFile('src/media-manifest.json', 'utf8'));
let mirrored = 0;
for (const product of products) {
  if (consecutiveFailures >= 10) { console.log('Source is throttling; stopping this batch.'); break; }
  if (!/^[0-9a-f-]{36}$/i.test(product.id)) continue;
  const destination = path.join(productMedia, `${product.id}.webp`);
  const local = await mirror(product.image_url, destination);
  if (local) { manifest[product.id] = `product-images/${product.id}.webp`; mirrored++; }
}
await fs.writeFile('src/media-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Product images ready: ${Object.keys(manifest).length}/${products.length}; downloaded or reused this run: ${mirrored}`);
