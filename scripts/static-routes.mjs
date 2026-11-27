
import fs from 'node:fs/promises';
import path from 'node:path';
import { articles, solutionPages } from '../src/pages.js';

const root = path.resolve('dist');
const origin = 'https://water.co.bw';
const brand = 'Puritech Botswana';
const html = await fs.readFile(path.join(root, 'index.html'), 'utf8');
const media = JSON.parse(await fs.readFile('src/media-manifest.json', 'utf8'));
const home = ['Puritech Botswana | Water Treatment, Filters & RO Systems', 'Shop water filters, reverse osmosis systems, pumps and water treatment equipment from Puritech Botswana in Gaborone. Enquire for product advice and quotes.'];
const routes = new Map([
  ['', home], ['home', home],
  ['about', ['About Puritech Botswana', 'Meet Puritech Botswana and learn how our Gaborone team helps homes and businesses choose suitable water treatment equipment.']],
  ['contact', ['Contact Puritech Botswana in Gaborone', 'Find our showroom, opening hours, phone numbers and email. Send a water treatment enquiry to the Puritech Botswana team.']],
  ['products', ['Shop Water Filters, Pumps & Treatment Equipment', 'Browse water filters, pumps, dispensers, cartridges and reverse osmosis equipment available for enquiry in Botswana.']],
  ['solutions', ['Water Treatment Solutions in Botswana', 'Explore solutions for boreholes, water shops, bottling and industrial water treatment.']],
  ['ro-range', ['Reverse Osmosis Systems in Botswana', 'Explore domestic and industrial reverse osmosis systems and enquire about the right capacity for your water source.']],
  ['journal', ['Water Treatment Blog', 'Read Puritech Botswana guides to water filtration, boreholes, softening and reverse osmosis.']],
  ['offers', ['Top Offers on Water Treatment Equipment', 'View current Puritech Botswana promotions and enquire about availability.']],
  ['editor', ['Site editor', '', '', true]],
  ['403', ['Editor access required', '', '', true]],
  ['terms-conditions', ['Legacy Terms and Conditions', 'View the archived Puritech Botswana terms from the previous website.']],
  ['steps-for-setting-up-a-water-shop-business', ['Water Shop Planning Checklist', 'Prepare the water analysis, site details and daily demand needed for a water shop quote.']],
  ['500lph-ro-system-on-skid', ['500 L/h Reverse Osmosis Skid Guide', 'Explore the equipment and specifications for a 500 litre-per-hour reverse osmosis skid.']],
  ...solutionPages.map(page => [page.slug, [page.title, page.lead]]),
  ...articles.map(article => ['journal/' + article.slug, [article.title, article.teaser]])
]);

try {
  const response = await fetch('https://azvpkkxbtnbbgpyvzbuw.supabase.co/rest/v1/products?select=id,name,category,description,image_url,source_url,featured,active,sort_order&active=eq.true&order=sort_order.asc,created_at.desc,id.asc&limit=1000', {
    headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(15000)
  });
  if (!response.ok) throw new Error('Catalogue returned ' + response.status);
  const products = await response.json();
  await fs.writeFile(path.join(root, 'catalogue-snapshot.json'), JSON.stringify(products));
  for (const item of products) {
    if (!/^[0-9a-f-]{36}$/i.test(item.id)) continue;
    const image = media[item.image_url];
    routes.set('product/' + item.id, [item.name, item.description || ('Enquire about ' + item.name + ' at Puritech Botswana.'), image]);
  }
} catch (error) {
  console.log('Product route generation skipped: ' + error.message);
}

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const canonical = route => origin + (route && route !== 'home' ? '/' + route + '/' : '/');
const organization = {
  '@context': 'https://schema.org', '@type': 'Organization', '@id': origin + '/#organization',
  name: brand, alternateName: 'Puritech', url: origin + '/', email: 'info@water.co.bw',
  logo: origin + '/favicon-96.png'
};
function pageHtml(route, [label, rawDescription, photo, noindex]) {
  const url = canonical(route);
  const title = label.includes(brand) ? label : label + ' | ' + brand;
  const summary = String(rawDescription || home[1]).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const description = summary.length > 160 ? summary.slice(0, 157).replace(/\s+\S*$/, '') + '…' : summary;
  const tags = [
    '<title>' + escape(title) + '</title>',
    '<meta name="description" content="' + escape(description) + '">',
    noindex ? '<meta name="robots" content="noindex,follow">' : '<link rel="canonical" href="' + escape(url) + '">',
    ...Object.entries({ 'og:title': title, 'og:description': description, 'og:type': 'website', 'og:url': url, 'og:site_name': brand, 'og:image': origin + '/' + (photo || 'editorial/shop.webp') })
      .map(([property, content]) => '<meta property="' + property + '" content="' + escape(content) + '">'),
    ...(route === '' ? ['<script type="application/ld+json">' + JSON.stringify([organization, {
      '@context': 'https://schema.org', '@type': 'WebSite', url, name: brand, alternateName: 'Puritech',
      publisher: { '@id': organization['@id'] }
    }]).replace(/</g, '\\u003c') + '</script>'] : [])
  ].join('\n    ');
  return html.replace(/<meta name="description"[^>]*>\s*<title>[^<]*<\/title>/, () => tags);
}

for (const [route, entry] of routes) {
  if (route && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(route)) throw new Error('Invalid route: ' + route);
  const directory = path.join(root, route);
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(path.join(directory, 'index.html'), pageHtml(route, entry));
}
await fs.writeFile(path.join(root, '404.html'), pageHtml('404', ['Page not found', '', '', true]));
const sitemap = [...routes].filter(([route, entry]) => !entry[3] && route !== 'home')
  .map(([route]) => '  <url><loc>' + escape(canonical(route)) + '</loc></url>').join('\n');
await fs.writeFile(path.join(root, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap + '\n</urlset>\n');
await fs.writeFile(path.join(root, 'robots.txt'), 'User-agent: *\nAllow: /\nSitemap: ' + origin + '/sitemap.xml\n');
console.log('Generated ' + routes.size + ' page entry points and a sitemap.');
