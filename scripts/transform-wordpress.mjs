import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('work/wp-source');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
const products = Array.from({ length: 5 }, (_, i) => read(`products-${i + 1}.json`)).flat();
const pages = read('pages-1.json');
const posts = read('posts-1.json');
const localProducts = JSON.parse(fs.readFileSync('work/supabase-products.json', 'utf8'));

function cleanHTML(html = '') {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|iframe|form|noscript|svg|button|select|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<input\b[^>]*>/gi, '')
    .replace(/<\/?(?:p|h[1-6]|ul|ol|li|strong|em|b|i|br|blockquote|table|thead|tbody|tr|th|td)\b[^>]*>/gi, tag => {
      const match = tag.match(/^<(\/)?(p|h[1-6]|ul|ol|li|strong|em|b|i|br|blockquote|table|thead|tbody|tr|th|td)\b/i);
      return match ? `<${match[1] || ''}${match[2].toLowerCase()}>` : '';
    })
    .replace(/<(?!\/?(?:p|h[1-6]|ul|ol|li|strong|em|b|i|br|blockquote|table|thead|tbody|tr|th|td)>)[^>]*>/gi, '')
    .replace(/(?:<br><\/br>|<br><br>)/g, '<br>')
    .replace(/\s{3,}/g, ' ')
    .trim();
}

const wordpressByPath = new Map(products.map(item => [new URL(item.permalink).pathname.replace(/\/$/, ''), item]));
const details = {};
let matched = 0;
let missingDescription = 0;
for (const local of localProducts) {
  let source;
  try { source = wordpressByPath.get(new URL(local.source_url).pathname.replace(/\/$/, '')); } catch { /* CMS products can have no source URL. */ }
  if (!source) source = products.find(item => item.name.toLowerCase() === local.name.toLowerCase());
  if (!source) continue;
  matched++;
  const html = cleanHTML(source.description || source.short_description || '');
  if (!html) missingDescription++;
  details[local.id] = {
    html,
    sku: source.sku || '',
    images: (source.images || []).map(image => image.src).filter(Boolean),
    attributes: (source.attributes || []).map(attribute => [attribute.name, (attribute.terms || []).join(', ')])
  };
}
fs.mkdirSync('src/product-details', { recursive: true });
for (const hex of '0123456789abcdef') {
  const chunk = Object.fromEntries(Object.entries(details).filter(([id]) => id[0].toLowerCase() === hex));
  fs.writeFileSync(`src/product-details/${hex}.json`, JSON.stringify(chunk));
}

const slugs = new Set([
  'about-us-2', 'contact-us-3', 'water-shop-setup', 'water-bottling-plant',
  'water-filling-line', 'water-bar', 'water-descaler', 'borehole-water-treatment',
  'bottle-blowing-machine', 'reverse-osmosis-systems',
  'steps-for-setting-up-a-water-shop-business', '500lph-ro-system-on-skid',
  'terms-conditions', 'privacy-policy-3',
  'the-uv-water-purification-solution', 'sand-filter',
  'effects-of-iron-in-drinking-water', 'importance-of-drinking-water',
  'borehole-drilling', 'hardness-in-water',
  'dmi-65-iron-removal-filter-iron-manganese-arsenic-removal',
  'water-filter-vs-water-purifier-whats-the-difference', 'what-is-a-water-softener',
  '5-harmful-effects-of-high-levels-of-iron-in-water'
]);
const imported = {};
for (const page of [...pages, ...posts]) {
  if (!slugs.has(page.slug)) continue;
  const html = cleanHTML(page.content?.rendered || '');
  if (html) imported[page.slug] = { title: page.title?.rendered || '', html };
}
fs.writeFileSync('src/imported-pages.json', JSON.stringify(imported));
console.log({ wordpressProducts: products.length, localProducts: localProducts.length, matched, missingDescription, importedPages: Object.keys(imported).length, detailsBytes: fs.readdirSync('src/product-details').reduce((size, file) => size + fs.statSync(`src/product-details/${file}`).size, 0), pagesBytes: fs.statSync('src/imported-pages.json').size });
