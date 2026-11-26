import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Check, ChevronDown, Droplets, Edit3, Filter, ImagePlus, Mail, MapPin, Menu, Phone, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { defaultContent, initialProducts } from './data';
import { articles, solutionPages } from './pages';
import importedPages from './imported-pages.json';
import mediaManifest from './media-manifest.json';
import productPhotos from './product-photos.json';
import { supabase, uploadImage } from './supabase';
import { logoUrl } from './logo';
import canatureLogo from './brand-media/canature';
import birdLogo from './brand-media/bird';
import vontronLogo from './brand-media/vontron';
import emblemLogo from './brand-media/emblem';
import purewaterLogo from './brand-media/purewater';
import industrialBanner from './promo-media/industrial_ro';
import pumpBanner from './promo-media/pump';
import iceBanner from './promo-media/ice';
import controllerBanner from './promo-media/controller';
import airBanner from './promo-media/air';
import housingBanner from './promo-media/housing';

const emptyProduct = { name: '', category: 'RO Home Use', description: '', image_url: '', source_url: '', featured: false, active: true, sort_order: 0 };
const emptyPromotion = { title: '', subtitle: '', image_url: '', cta_label: 'Enquire now', active: true, sort_order: 0 };
const productDetailModules = import.meta.glob('./product-details/*.json');
const basePath = import.meta.env.BASE_URL;
const routeFromLocation = () => location.pathname.startsWith(basePath) ? location.pathname.slice(basePath.length).replace(/\/$/, '') || 'home' : 'home';
function navigate(path) { history.pushState(null, '', `${basePath}${path}`); dispatchEvent(new PopStateEvent('popstate')); }
const bundledHeroes = import.meta.glob('./hero-media/*.webp', { eager: true, import: 'default' });
const editorialMedia = import.meta.glob('./editorial-media/*.webp', { eager: true, import: 'default' });
const aboutTeamPhoto = editorialMedia['./editorial-media/about-team.webp'];
const heroMedia = {
  ...Object.fromEntries(Object.entries(bundledHeroes).map(([file, url]) => [file.split('/').at(-1).replace('.webp', ''), url])),
  products: basePath + 'editorial/shop.webp'
};
const articleMedia = ['blog_uv','blog_sand','blog_iron','blog_drinking','blog_borehole','blog_hardness','blog_dmi','blog_filter','blog_softener','blog_iron_effects'];
const additionalGuides = [
  { slug: 'steps-for-setting-up-a-water-shop-business', title: 'Setting up a water shop', description: 'A practical guide to planning your water shop business.' },
  { slug: '500lph-ro-system-on-skid', title: '500 LPH RO system on skid', description: 'Explore a packaged reverse osmosis system for commercial treatment.' }
];
function EditorialPhoto({ name, alt = '', className = '' }) {
  const src = editorialMedia['./editorial-media/' + name + '.webp'];
  const isHero = className === 'article-hero-photo';
  return <div className={'editorial-photo ' + className}>
    {src && <img src={src} alt={alt} loading={isHero ? 'eager' : 'lazy'} decoding="async" fetchPriority={isHero ? 'high' : 'auto'}/>}
  </div>;
}

function App() {
  const [page, setPage] = useState(() => { if (location.hash.startsWith('#/')) { const legacy = location.hash.slice(2) || 'home'; history.replaceState(null, '', `${basePath}${legacy}`); } return routeFromLocation(); });
  const pageHero = heroMedia[page === 'ro-range' ? 'ro' : page];
  const [products, setProducts] = useState(initialProducts);
  const [promotions, setPromotions] = useState([]);
  const [content, setContent] = useState(defaultContent);
  const [user, setUser] = useState(null);
  const [isEditor, setIsEditor] = useState(false);
  const [modal, setModal] = useState(null);
  const [enquireProduct, setEnquireProduct] = useState(undefined);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All products');
  const [visibleCount, setVisibleCount] = useState(24);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState('');
  const [cmsReady, setCmsReady] = useState(true);
  const [catalogueLoading, setCatalogueLoading] = useState(true);

  useEffect(() => {
    const onRoute = () => { if (location.hash) return; setPage(routeFromLocation()); setMobileMenu(false); window.scrollTo(0, 0); };
    const onInternalLink = event => {
      const anchor = event.target.closest?.('a[href]');
      if (!anchor || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return;
      const destination = new URL(anchor.href, location.href);
      if (destination.origin !== location.origin || !destination.pathname.startsWith(basePath) || destination.hash) return;
      event.preventDefault(); navigate(destination.pathname.slice(basePath.length) || 'home');
    };
    addEventListener('popstate', onRoute);
    document.addEventListener('click', onInternalLink);
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { removeEventListener('popstate', onRoute); document.removeEventListener('click', onInternalLink); subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [p, o, c] = await Promise.all([
        supabase.from('products').select('*').order('sort_order').order('created_at', { ascending: false }),
        supabase.from('promotions').select('*').order('sort_order'),
        supabase.from('site_content').select('key,value'),
      ]);
      if (cancelled) return;
      setCatalogueLoading(false);
      if (p.error || o.error || c.error) { setCmsReady(false); return; }
      setCmsReady(true);
      if (p.data?.length) setProducts(p.data.map(product => cleanTextFields(product, ["name", "category", "description"])));
      setPromotions((o.data || []).map(promotion => cleanTextFields(promotion, ["title", "subtitle", "cta_label"])));
      setContent({ ...defaultContent, ...Object.fromEntries((c.data || []).map(({ key, value }) => [key, typeof value === "string" && !key.endsWith("_image") ? readableSourceText(value) : value])) });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setIsEditor(false); return; }
    supabase.from('editors').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setIsEditor(Boolean(data)));
  }, [user]);


  function flash(message) { setNotice(message); setTimeout(() => setNotice(''), 4500); }
  async function saveContent(changes) {
    const rows = Object.entries(changes).map(([key, value]) => ({ key, value }));
    const { error } = await supabase.from('site_content').upsert(rows);
    if (error) throw error;
    setContent(previous => ({ ...previous, ...changes }));
  }
  async function saveProduct(item) {
    const payload = { ...item };
    if (String(payload.id || '').startsWith('source-')) delete payload.id;
    delete payload.created_at;
    const { data, error } = await supabase.from('products').upsert(payload).select().single();
    if (error) throw error;
    setProducts(previous => [...previous.filter(p => p.id !== item.id), data]);
  }
  async function savePromotion(item) {
    const payload = cleanTextFields(item, ["title", "subtitle", "cta_label"]);
    delete payload.created_at;
    if (!payload.id) delete payload.id;
    const { data, error } = await supabase.from('promotions').upsert(payload).select().single();
    if (error) throw error;
    setPromotions(previous => [...previous.filter(p => p.id !== item.id), data]);
  }
  async function remove(kind, item) {
    if (!confirm(`Remove "${item.name || item.title}"?`)) return;
    if (kind === 'product' && String(item.id).startsWith('source-')) { flash('This starter item must be replaced with a CMS entry first.'); return; }
    const { error } = await supabase.from(kind === 'product' ? 'products' : 'promotions').delete().eq('id', item.id);
    if (error) return flash(error.message);
    if (kind === 'product') setProducts(previous => previous.filter(p => p.id !== item.id));
    else setPromotions(previous => previous.filter(p => p.id !== item.id));
    flash('Removed.');
  }
  const activeProducts = products.filter(p => p.active !== false);
  const categoryCounts = activeProducts.reduce((counts, product) => {
    counts[product.category || 'Other equipment'] = (counts[product.category || 'Other equipment'] || 0) + 1;
    return counts;
  }, {});
  const categories = ['All products', ...Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a] || a.localeCompare(b))];
  const filtered = useMemo(() => activeProducts.filter(p =>
    (category === 'All products' || p.category === category) &&
    `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(search.toLowerCase())
  ), [activeProducts, category, search]);
  const featured = activeProducts.filter(p => p.featured).slice(0, 6);
  const activePromos = promotions.filter(p => p.active);
  const edit = (fields, title, defaults = {}) => setModal({ kind: 'content', title, fields, item: Object.fromEntries(fields.map(f => [f, content[f] || defaults[f] || ''])) });
  const chooseCategory = value => { setCategory(value); setVisibleCount(24); navigate('products'); };
  const productActions = item => isEditor && <div className="card-edit"><button aria-label={`Edit ${item.name}`} onClick={e => { e.stopPropagation(); setModal({ kind: 'product', item }); }}><Edit3 size={15}/></button><button aria-label={`Delete ${item.name}`} onClick={e => { e.stopPropagation(); remove('product', item); }}><Trash2 size={15}/></button></div>;
  const currentSolution = solutionPages.find(item => item.slug === page);
  const currentArticle = articles.find(item => page === `journal/${item.slug}`);
  const currentProduct = page.startsWith('product/') ? activeProducts.find(item => String(item.id) === page.slice(8)) : null;

  return <>
    <div className="topline"><div className="container top-inner"><span>Mon - Fri: 8AM - 5PM <span className="top-separator">/</span> Water treatment expertise since 2007</span><span><a href={`tel:${content.contact_phone.replace(/\s/g, '')}`}>{content.contact_phone}</a><span className="top-separator">/</span><a href={`tel:${(content.contact_phone_secondary || '').replace(/\s/g, '')}`}>{content.contact_phone_secondary}</a><i/> <a href={`mailto:${content.contact_email}`}>{content.contact_email}</a></span></div></div>
    <header className="site-header store-header">
      <div className="container store-main">
        <a className="brand" href="/Puritech-Botswana-/home" aria-label="Puritech Botswana home"><img className="brand-logo" src={logoUrl} alt="Puritech Botswana"/></a>
        <form className="store-search" role="search" onSubmit={event => { event.preventDefault(); setCategory('All products'); setVisibleCount(24); navigate('products'); }}><Search size={20}/><input aria-label="Search products" type="search" placeholder="Search products, systems and parts" value={search} onChange={event => setSearch(event.target.value)} maxLength={120}/><button type="submit">Search</button></form>
        <button className="store-enquire" onClick={() => setEnquireProduct(null)}><Mail size={19}/><span>Ask about a product<small>Enquiry based ordering</small></span></button>
        <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu" aria-expanded={mobileMenu}>{mobileMenu ? <X/> : <Menu/>}</button>
      </div>
      <div className="store-nav"><div className="container store-nav-inner">
        <details className="store-categories"><summary><Menu size={20}/> Shop by categories <ChevronDown size={16}/></summary><div className="store-category-menu">{categories.slice(1).map(name => <button key={name} type="button" onClick={() => { chooseCategory(name); document.querySelector('.store-categories')?.removeAttribute('open'); }}>{name}<span>{categoryCounts[name]}</span></button>)}</div></details>
        <nav className={mobileMenu ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">{[['Home','home'],['About us','about'],['Info','solutions'],['RO systems','ro-range'],['Shop','products'],['Blog','journal'],['Contact us','contact']].map(([label, path]) => <a className={page === path || (path === 'solutions' && currentSolution) ? 'active' : ''} key={path} href={`/Puritech-Botswana-/${path}`}>{label}</a>)}</nav>
        <a className="top-offers-link" href="/Puritech-Botswana-/offers">Top offers <ArrowUpRight size={15}/></a>
      </div></div>
    </header>
    {isEditor && <div className="editor-strip"><div className="container"><span><span className="live-dot"/> LIVE EDIT MODE</span><span>Click any pencil to update the page. Changes appear immediately.</span><div><button onClick={() => setModal({ kind: 'product', item: { ...emptyProduct, sort_order: products.length } })}><Plus size={15}/> Product</button><button onClick={() => setModal({ kind: 'promotion', item: { ...emptyPromotion, sort_order: promotions.length } })}><Plus size={15}/> Promotion</button><button onClick={async () => { await supabase.auth.signOut(); flash('Signed out.'); }}>Sign out</button></div></div></div>}
    <div className="page-content" key={page}>
    {page === 'editor' && <EditorLogin user={user} isEditor={isEditor}/>}
    {page === 'home' && <main>
      <section className="hero" style={pageHero ? { '--hero-photo': `url("${content.hero_image && content.hero_image !== defaultContent.hero_image ? content.hero_image : pageHero}")` } : {}}><div className="container hero-grid"><div className="hero-copy" data-reveal><div className="eyebrow"><span className="eyebrow-line"/>{content.hero_eyebrow}</div><h1>{content.hero_title}</h1><p>{content.hero_description}</p><div className="hero-buttons"><a className="btn btn-blue" href="/Puritech-Botswana-/products">Explore products <ArrowUpRight size={18}/></a><button className="btn btn-outline" onClick={() => setEnquireProduct(null)}>Talk to an expert</button></div><div className="hero-foot"><span><strong>2007</strong> Established in Botswana</span><span className="foot-divider"/><span><strong>Home to industry</strong> Solutions for every scale</span></div>{isEditor && <EditButton onClick={() => edit(['hero_eyebrow','hero_title','hero_description','hero_image'], 'Edit hero')}/>}</div><div className="hero-visual" data-reveal><div className="hero-stamp"><Droplets size={19}/><span>PURE WATER<br/><strong>BETTER FUTURE</strong></span></div></div></div></section>
      <section className="store-benefits"><div className="container"><span><Droplets size={23}/> Product advice for every application</span><span><ShieldCheck size={23}/> Local support since 2007</span><span><Mail size={23}/> Enquire before you order</span></div></section>
      <section className="section category-shop"><div className="container"><div className="section-heading"><div><span className="kicker">SHOP BY CATEGORY</span><h2>What are you looking for?</h2></div><a className="under-link" href="/Puritech-Botswana-/products">All {activeProducts.length} products <ArrowUpRight size={17}/></a></div><div className="store-category-grid">{categories.slice(1,9).map(name => { const product = activeProducts.find(item => item.category === name && (productPhotos[item.archive_id || item.id] || item.image_url)); return <button className="store-category-card" key={name} onClick={() => chooseCategory(name)}><span className="category-photo">{product ? <CataloguePhoto key={product.id} sources={productSources(product)} alt=""/> : <Droplets size={58} strokeWidth={1}/>}</span><strong>{name}</strong><small>{categoryCounts[name]} products</small></button>; })}</div></div></section>
      <ShowcaseBanners content={content} isEditor={isEditor} edit={edit} onChoose={chooseCategory}/>
      <section className="section product-section storefront-products" id="offers"><div className="container"><div className="section-heading" data-reveal><div><span className="kicker">CURATED FOR YOU</span><h2>Featured products</h2><p>Explore the equipment, then ask us for the right configuration.</p></div><a className="under-link" href="/Puritech-Botswana-/products">Shop all products <ArrowUpRight size={17}/></a></div><div className="product-grid">{(featured.length ? featured : activeProducts.slice(0,6)).map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div></div></section>
      <section className="store-campaigns section"><div className="container"><div className="campaign-grid"><div className="campaign-panel water-business" style={pageHero ? { backgroundImage: `linear-gradient(90deg,rgba(5,31,49,.93),rgba(5,31,49,.34)),url("${pageHero}")` } : {}}><span>BUSINESS OPPORTUNITY</span><h2>Start a water business.</h2><p>From treatment to filling, talk to us about a setup that fits your source water.</p><a href="/Puritech-Botswana-/water-shop-setup">Explore water shop setup <ArrowUpRight size={17}/></a></div><div className="campaign-panel industrial-systems"><span>COMMERCIAL & INDUSTRIAL</span><h2>RO systems built for scale.</h2><p>Explore our reverse osmosis range and enquire about the right capacity.</p><a href="/Puritech-Botswana-/ro-range">Explore RO systems <ArrowUpRight size={17}/></a></div></div></div></section>
      {(activePromos.length > 0 || isEditor) && <section className="promos-section section"><div className="container"><div className="section-heading"><div><span className="kicker">CURRENT PROMOTIONS</span><h2>{content.offers_title || 'Offers & announcements'}</h2></div><a className="under-link" href="/Puritech-Botswana-/offers">View all offers <ArrowUpRight size={17}/></a></div>{isEditor && <div className="offer-editor-actions"><EditButton onClick={() => edit(['offers_title','offers_description'], 'Edit offers introduction')}/><button onClick={() => setModal({ kind: 'promotion', item: { ...emptyPromotion, sort_order: promotions.length } })}><Plus size={16}/> Add promotion</button></div>}<div className="promo-grid">{activePromos.map(p => <div className="promo-card" key={p.id} style={p.image_url ? { backgroundImage: `linear-gradient(90deg,rgba(4,26,47,.85),rgba(4,26,47,.12)),url("${p.image_url}")` } : {}}><div><span className="kicker">PURITECH BOTSWANA</span><h3>{p.title}</h3><p>{p.subtitle}</p><button className="btn btn-white" onClick={() => setEnquireProduct({ name: p.title })}>{p.cta_label || 'Enquire now'} <ArrowUpRight size={17}/></button></div>{isEditor && <div className="card-edit"><button onClick={() => setModal({ kind: 'promotion', item: p })}><Edit3 size={15}/></button><button onClick={() => remove('promotion', p)}><Trash2 size={15}/></button></div>}</div>)}</div></div></section>}
      <section className="section store-new"><div className="container"><div className="section-heading"><div><span className="kicker">MORE TO EXPLORE</span><h2>Browse the range</h2></div><a className="under-link" href="/Puritech-Botswana-/products">View the catalogue <ArrowUpRight size={17}/></a></div><div className="product-grid">{activeProducts.slice(6,12).map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div></div></section>
      <BrandMarquee content={content} isEditor={isEditor} edit={edit}/>
      <section className="section intro-section"><div className="container intro-grid"><div data-reveal><span className="kicker">THE PURITECH APPROACH</span><h2>{content.intro_title}</h2>{isEditor && <EditButton onClick={() => edit(['intro_title','intro_description'], 'Edit introduction')}/>}</div><div data-reveal><p>{content.intro_description}</p><a className="under-link" href="/Puritech-Botswana-/about">Get to know us <ArrowUpRight size={17}/></a></div></div></section>
      <section className="editorial"><div className="container editorial-inner"><div><span className="kicker">NEED A RECOMMENDATION?</span><h2>Water problems are different.<br/><em>So are the solutions.</em></h2><p>Tell us about your water source, required volume and intended use. We can help you select the equipment.</p><button className="btn btn-white" onClick={() => setEnquireProduct(null)}>Send an enquiry <ArrowUpRight size={17}/></button></div><div className="editorial-art"><div className="art-ring"/><Droplets size={120} strokeWidth={1}/></div></div></section>
    </main>}
    {page === 'offers' && <main className="offers-page"><PageBanner kicker="PURITECH / TOP OFFERS" title={content.offers_title || 'Offers worth exploring.'} description={content.offers_description || 'Current promotions and selected equipment. Ask our team for availability and a current quote.'} image={activePromos[0]?.image_url || pageHero}/><section className="section promos-section"><div className="container"><div className="section-heading"><div><span className="kicker">LATEST PROMOTIONS</span><h2>Current announcements</h2></div>{isEditor && <button className="offer-add" onClick={() => setModal({ kind: 'promotion', item: { ...emptyPromotion, sort_order: promotions.length } })}><Plus size={17}/> Add promotion</button>}</div>{isEditor && <EditButton onClick={() => edit(['offers_title','offers_description'], 'Edit offers page')}/>}{activePromos.length ? <div className="promo-grid">{activePromos.map(p => <div className="promo-card" key={p.id} style={p.image_url ? { backgroundImage: `linear-gradient(90deg,rgba(4,26,47,.87),rgba(4,26,47,.24)),url("${p.image_url}")` } : {}}><div><span className="kicker">PURITECH BOTSWANA</span><h3>{p.title}</h3><p>{p.subtitle}</p><button className="btn btn-white" onClick={() => setEnquireProduct({ name: p.title })}>{p.cta_label || 'Enquire now'} <ArrowUpRight size={17}/></button></div>{isEditor && <div className="card-edit"><button aria-label={`Edit ${p.title}`} onClick={() => setModal({ kind: 'promotion', item: p })}><Edit3 size={15}/></button><button aria-label={`Delete ${p.title}`} onClick={() => remove('promotion', p)}><Trash2 size={15}/></button></div>}</div>)}</div> : <div className="offers-empty"><h3>New offers are on the way.</h3><p>Explore the current product range or contact our team for a quote.</p><a href="/Puritech-Botswana-/products" className="btn btn-blue">Browse products <ArrowUpRight size={17}/></a></div>}</div></section><section className="section storefront-products"><div className="container"><div className="section-heading"><div><span className="kicker">EXPLORE THE RANGE</span><h2>Featured equipment</h2></div><a className="under-link" href="/Puritech-Botswana-/products">All products <ArrowUpRight size={17}/></a></div><div className="product-grid">{(featured.length ? featured : activeProducts.slice(0,6)).map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div></div></section></main>}
    {page === 'products' && <main><PageBanner kicker="THE PRODUCT RANGE" title={content.products_title || "Find your water solution."} description={content.products_description || "Explore our full equipment range. Need guidance? Send an enquiry and our team will help."} image={pageHero}/>{isEditor && <div className="container page-edit"><EditButton onClick={() => edit(["products_title","products_description"], "Edit products introduction", { products_title: "Find your water solution.", products_description: "Explore our full equipment range. Need guidance? Send an enquiry and our team will help." })}/></div>}<section className="section catalogue"><div className="container"><div className="catalogue-tools"><label className="search-box"><Search size={19}/><input placeholder="Search products" value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(24); }}/></label><label className="select-wrap"><SlidersHorizontal size={18}/><select value={category} onChange={e => { setCategory(e.target.value); setVisibleCount(24); }}>{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={16}/></label><span className="result-count">{filtered.length} {filtered.length === 1 ? 'product' : 'products'}</span></div><div className="catalogue-layout"><aside className="category-sidebar"><span className="kicker">CATEGORIES</span>{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => { setCategory(c); setVisibleCount(24); }}>{c}<span>{c === 'All products' ? activeProducts.length : activeProducts.filter(p => p.category === c).length}</span></button>)}</aside><div>{filtered.length ? <div className="product-grid catalogue-grid">{filtered.slice(0, visibleCount).map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div> : <div className="empty-state">No products match that search. Try a different category or <button onClick={() => {setSearch('');setCategory('All products');}}>clear filters</button>.</div>}{filtered.length > visibleCount && <div className="load-more"><button className="btn btn-outline-dark" onClick={() => setVisibleCount(count => count + 24)}>Show more products</button><span>Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</span></div>}</div></div></div></section></main>}
    {page.startsWith('product/') && (currentProduct ? <ProductDetail product={currentProduct} related={activeProducts.filter(item => item.id !== currentProduct.id && item.category === currentProduct.category).slice(0, 3)} onEnquire={setEnquireProduct} actions={productActions(currentProduct)} content={content} isEditor={isEditor} edit={edit}/> : <main className="product-detail missing-product"><div className="container"><a href="/Puritech-Botswana-/products" className="back-link">Back to products</a><h1>{catalogueLoading ? 'Loading product...' : 'Product unavailable'}</h1>{!catalogueLoading && <p>This item may have been removed. Browse the current catalogue to find an alternative.</p>}</div></main>)}
    {page === 'solutions' && <SolutionsHub pages={solutionPages} image={pageHero} content={content} edit={edit} isEditor={isEditor} onEnquire={() => setEnquireProduct(null)}/>}
    {additionalGuides.map(guide => page === guide.slug && <main key={guide.slug}><PageBanner kicker="PURITECH / TECHNICAL GUIDE" title={guide.title} description={guide.description} image={pageHero}/><ImportedContent page={importedPages[guide.slug]} content={content} isEditor={isEditor} edit={edit} contentKey={'archive_' + guide.slug + '_body'}/><section className="solution-next"><div className="container"><h2>Need help applying this to your project?</h2><button className="btn btn-white" onClick={() => setEnquireProduct({ name: guide.title })}>Send an enquiry <ArrowUpRight size={17}/></button></div></section></main>)}
    {page === 'ro-range' && <ROSystems products={activeProducts} image={pageHero} onEnquire={setEnquireProduct}/>}
    {currentSolution && <SolutionDetail page={currentSolution} product={activeProducts.find(p => p.name.toLowerCase().includes(currentSolution.imageSearch.toLowerCase()))} content={content} edit={edit} isEditor={isEditor} onEnquire={() => setEnquireProduct({ name: currentSolution.title })}/>}
    {page === 'journal' && <Journal articles={articles} image={pageHero} content={content} edit={edit} isEditor={isEditor}/>}
    {currentArticle && <ArticleDetail article={currentArticle} content={content} edit={edit} isEditor={isEditor} onEnquire={() => setEnquireProduct(null)}/>}
    {page === 'about' && <AboutPage image={pageHero} content={content} isEditor={isEditor} edit={edit} onEnquire={() => setEnquireProduct(null)}/>}
    {page === 'contact' && <main className="contact-page"><PageBanner image={pageHero} kicker="CONTACT OUR TEAM" title={content.contact_title} description={content.contact_description}/>{isEditor && <div className="container page-edit"><EditButton onClick={() => edit(['contact_title','contact_description','contact_email','contact_phone','contact_phone_secondary','contact_address'], 'Edit contact details')}/></div>}<section className="section contact-section"><div className="container contact-layout"><div><span className="kicker">WE'RE HERE TO HELP</span><h2>Start the conversation.</h2><p>Tell us about the water challenge, the product you have in mind, or the project you are planning.</p><div className="contact-items"><a href={`mailto:${content.contact_email}`}><Mail/><span><small>EMAIL US</small>{content.contact_email}</span></a><a href={`tel:${content.contact_phone.replace(/\s/g,'')}`}><Phone/><span><small>CALL US</small>{content.contact_phone}</span></a><a href={`tel:${(content.contact_phone_secondary || '').replace(/\s/g,'')}`}><Phone/><span><small>ALTERNATIVE NUMBER</small>{content.contact_phone_secondary}</span></a><div><MapPin/><span><small>VISIT US</small>{content.contact_address}</span></div></div><ContactMap address={content.contact_address}/><small className="hours">Monday - Friday &middot; 8:00 AM - 5:00 PM</small></div><EnquiryForm product={null} email={content.contact_email} inline/></div></section></main>}
    {page === 'contact' && <ImportedContent page={importedPages['contact-us-3']} content={content} isEditor={isEditor} edit={edit} contentKey="archive_contact_body"/>}
    </div>
    <footer className="footer"><div className="container footer-grid"><div><a className="brand footer-brand" href="/Puritech-Botswana-/home"><img className="brand-logo" src={logoUrl} alt="Puritech Botswana"/></a><p>Water treatment solutions for homes, businesses and industry across Botswana.</p></div><div><strong>Explore</strong><a href="/Puritech-Botswana-/home">Home</a><a href="/Puritech-Botswana-/products">Products</a><a href="/Puritech-Botswana-/solutions">Solutions</a><a href="/Puritech-Botswana-/about">About us</a><a href="/Puritech-Botswana-/journal">Journal</a><a href="/Puritech-Botswana-/contact">Contact</a></div><div><strong>Get in touch</strong><a href={`mailto:${content.contact_email}`}>{content.contact_email}</a><a href={`tel:${content.contact_phone.replace(/\s/g,'')}`}>{content.contact_phone}</a><a href={`tel:${(content.contact_phone_secondary || '').replace(/\s/g, '')}`}>{content.contact_phone_secondary}</a><a href="https://www.facebook.com/sanctityH20/" target="_blank" rel="noopener noreferrer">Facebook</a><span>Gaborone, Botswana</span></div></div><div className="container footer-bottom"><span>&copy; {new Date().getFullYear()} Puritech Botswana. All rights reserved.</span><a href="https://futurifydesigns.com/" target="_blank" rel="noopener noreferrer">Built by Futurify Designs</a></div></footer>
    {notice && <div className="toast" role="status">{notice}</div>}
    {enquireProduct !== undefined && enquireProduct !== null && <div className="modal-backdrop" onMouseDown={() => setEnquireProduct(undefined)}><div className="modal enquiry-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEnquireProduct(undefined)} aria-label="Close"><X/></button><span className="kicker">REQUEST AN ENQUIRY</span><h2>Let's find the right fit.</h2><EnquiryForm product={enquireProduct} email={content.contact_email}/></div></div>}
    {enquireProduct === null && <div className="modal-backdrop" onMouseDown={() => setEnquireProduct(undefined)}><div className="modal enquiry-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEnquireProduct(undefined)} aria-label="Close"><X/></button><span className="kicker">REQUEST AN ENQUIRY</span><h2>Let's find the right fit.</h2><EnquiryForm product={null} email={content.contact_email}/></div></div>}
    {modal && <EditorModal modal={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); flash('Changes published.'); }} saveContent={saveContent} saveProduct={saveProduct} savePromotion={savePromotion} categories={categories} isEditor={isEditor} user={user} cmsReady={cmsReady} flash={flash}/>}
  </>;
}

const marqueeBrands = [
  ['Canature','canature',canatureLogo], ['Partner logo','bird',birdLogo],
  ['Vontron','vontron',vontronLogo], ['Partner logo','emblem',emblemLogo],
  ['PureWater','purewater',purewaterLogo]
];
const aboutBranches = [
  {
    title: 'Where we started',
    branches: [
      ['Founded in Botswana', 'SANCTITY (Pty) Ltd began operating as Puritech Botswana in 2007.'],
      ['Based in Gaborone', 'Find our team in the Gaborone International Commerce Park.']
    ]
  },
  {
    title: 'Who we work with',
    branches: [
      ['Homes and small businesses', 'We help you choose filters, cartridges and drinking-water systems for your space and daily use.'],
      ['Commercial and industrial sites', 'We help specify treatment equipment for the source water, volumes and operating conditions of your site.']
    ]
  },
  {
    title: 'How we work',
    branches: [
      ['Understand the source', 'We ask where your water comes from, what you need it for, and what you already know about its quality.'],
      ['Choose the equipment', 'We help you match each treatment stage and component to the work it needs to do.'],
      ['Support it over time', 'We can help with maintenance advice and finding the right replacement parts.']
    ]
  }
];

function AboutPage({ image, content, isEditor, edit, onEnquire }) {
  return <main className="about-page about-redesign">
    <section className="about-hero">
      <img className="about-hero-photo" src={image} alt="" fetchPriority="high" width="1440" height="600"/>
      <div className="container about-hero-copy">
        <span className="kicker">ABOUT PURITECH BOTSWANA</span>
        <h1>{content.about_title}</h1>
        <a className="btn btn-white" href="#our-story">Explore our story <ChevronDown size={17}/></a>
      </div>
    </section>

    <section className="section container about-tree-layout" id="our-story">
      <div className="about-tree-intro">
        <h2>Our story and how we work</h2>
        <p>{content.about_description}</p>
        {isEditor && <EditButton onClick={() => edit(['about_title', 'about_description'], 'Edit about page')}/>}
        <img src={aboutTeamPhoto} alt="Illustration of water treatment technicians checking a water sample" width="900" height="675" loading="lazy" decoding="async"/>
      </div>
      <div className="about-tree">
        {aboutBranches.map(({ title, branches }, index) => <details className="about-branch" key={title} open={index === 0}>
          <summary>{title}<ChevronDown size={19} aria-hidden="true"/></summary>
          <div className="about-twigs">
            {branches.map(([label, text]) => <details key={label}>
              <summary>{label}<ChevronDown size={16} aria-hidden="true"/></summary>
              <p>{text}</p>
            </details>)}
          </div>
        </details>)}
        {importedPages['about-us-2']?.html && <details className="about-branch">
          <summary>Full company profile<ChevronDown size={19} aria-hidden="true"/></summary>
          <ImportedContent page={importedPages['about-us-2']} content={content} isEditor={isEditor} edit={edit} contentKey="archive_about_body"/>
        </details>}
      </div>
    </section>

    <section className="about-next">
      <div className="container">
        <h2>Tell us what you need your water to do.</h2>
        <button className="btn btn-white" onClick={onEnquire}>Start an enquiry <ArrowUpRight size={17}/></button>
      </div>
    </section>
  </main>;
}
function BrandMarquee({ content, isEditor, edit }) {
  const fields = marqueeBrands.map((_, index) => `brand_${index + 1}_image`);
  return <section className="brand-section" aria-label="Brands in the Puritech range"><div className="container brand-section-heading"><div><span className="kicker">TECHNOLOGY & PARTNERS</span><h2>Trusted names in water treatment.</h2></div>{isEditor && <EditButton onClick={() => edit(fields, 'Edit brand logos')}/>}</div><div className="brand-marquee"><div className="brand-track">{[0,1].map(copy => <div className="brand-set" key={copy} aria-hidden={copy === 1}>{marqueeBrands.map(([label,slug,defaultImage],index) => <div className={`brand-item brand-${slug}`} key={`${copy}-${slug}`} aria-label={copy === 0 ? label : undefined}><img src={content[`brand_${index + 1}_image`] || defaultImage} alt={copy === 0 ? label : ''} loading="lazy" decoding="async"/></div>)}</div>)}</div></div></section>;
}
const showcaseItems = [
  { label: 'PURE WATER', title: 'Industrial RO', category: 'RO Industrial', image: industrialBanner, tone: 'ink' },
  { label: 'HIGH FLOW', title: 'Water pressure pumps', category: 'Pumps', image: pumpBanner, tone: 'royal' },
  { label: 'COLD & CHILLED', title: 'Ice machines', category: 'Ice Machines', image: iceBanner, tone: 'green' },
  { label: 'PUMP CONTROLLERS', title: 'Adaptive & smart', category: 'Pump Controllers', image: controllerBanner, tone: 'navy' },
  { label: 'PURE AIR', title: 'Clean & fresh', category: 'Air Coolers', image: airBanner, tone: 'yellow' },
  { label: 'FILTRATION', title: 'Water filter housings', category: 'Filter Housings', image: housingBanner, tone: 'red' }
];
function ShowcaseBanners({ content, isEditor, edit, onChoose }) {
  return <section className="section showcase-section"><div className="container"><div className="section-heading"><div><span className="kicker">EXPLORE THE EQUIPMENT</span><h2>Solutions for every scale.</h2></div></div><div className="showcase-grid">{showcaseItems.map((item, index) => {
    const key = `showcase_${index + 1}`;
    const title = content[`${key}_title`] || item.title;
    return <div className={`showcase-card tone-${item.tone}`} key={key} style={{ backgroundImage: `url("${content[`${key}_image`] || item.image}")` }}><div><span>{content[`${key}_label`] || item.label}</span><h3>{title}</h3><button onClick={() => onChoose(item.category)}>Explore range <ArrowUpRight size={16}/></button></div>{isEditor && <EditButton onClick={() => edit([`${key}_label`,`${key}_title`,`${key}_image`], `Edit ${title}`)}/>}</div>;
  })}</div></div></section>;
}

function SolutionsHub({ pages, image, content, edit, isEditor, onEnquire }) {
  return <main className="solutions-hub">
    <section className="solutions-hero" style={image ? {"--hero-photo": "url(" + image + ")"} : {}}><div className="container"><span className="kicker" data-reveal>WHAT WE HELP YOU BUILD</span><h1 data-reveal>{content.solutions_title || 'From a single glass to a full production line.'}</h1><p data-reveal>{content.solutions_description || 'Explore the applications and equipment behind better water. Each project starts with a conversation about your water and your goals.'}</p><button className="btn btn-white" onClick={onEnquire}>Discuss your project <ArrowUpRight size={17}/></button>{isEditor && <EditButton onClick={() => edit(['solutions_title','solutions_description'], 'Edit solutions introduction', { solutions_title: 'From a single glass to a full production line.', solutions_description: 'Explore the applications and equipment behind better water. Each project starts with a conversation about your water and your goals.' })}/>}</div><span className="solutions-watermark">WATER / WORK</span></section>
    <section className="section solution-directory"><div className="container"><div className="section-heading"><div><span className="kicker">EXPLORE BY APPLICATION</span><h2>Choose your starting point.</h2></div><span className="directory-count">{pages.length} areas of expertise</span></div><div className="solution-tiles">{pages.map(item => <a className={`solution-tile tile-${item.theme}`} href={`/Puritech-Botswana-/${item.slug}`} key={item.slug} data-reveal><img className="solution-card-photo" src={basePath + "editorial/" + item.slug + ".webp"} alt="" loading="lazy" decoding="async"/><div><span className="kicker">{item.eyebrow}</span><h3>{item.title}</h3><p>{item.lead}</p></div><ArrowUpRight size={24}/></a>)}</div></div></section>
    <section className="section extra-guides"><div className="container"><span className="kicker">PRACTICAL GUIDES</span><h2>Plan the next step.</h2><div>{additionalGuides.map(guide => <a href={`/Puritech-Botswana-/${guide.slug}`} key={guide.slug}><img className="guide-photo" src={basePath + "editorial/" + guide.slug + ".webp"} alt="" loading="lazy"/><strong>{guide.title}</strong><span>{guide.description}</span><ArrowUpRight size={19}/></a>)}</div></div></section>
  </main>;
}

function ROSystems({ products, image, onEnquire }) {
  const groups = [
    { title: 'For the home', media: 'ro_home', category: 'RO Home Use', description: 'Compact systems for treated drinking water at the point of use.', marker: '01' },
    { title: 'For business and industry', media: 'ro_industrial', category: 'RO Industrial', description: 'Higher capacity equipment for production, processing and demanding sites.', marker: '02' },
    { title: 'Complete treatment systems', media: 'ro_complete', category: 'Complete RO Water Treatment Systems', description: 'Integrated treatment plants designed around your water analysis and output needs.', marker: '03' }
  ];
  return <main className="ro-page"><section className="ro-cover" style={image ? {"--hero-photo": "url(" + image + ")"} : {}}><div className="container"><span className="kicker" data-reveal>REVERSE OSMOSIS / PURITECH</span><h1 data-reveal>Water, refined<br/><em>for your purpose.</em></h1><p data-reveal>Explore reverse osmosis systems for homes, businesses and industrial projects. Capacity and pretreatment depend on the source water.</p><button className="btn btn-white" onClick={() => onEnquire(null)}>Discuss an RO system <ArrowUpRight size={17}/></button></div></section><section className="section ro-directory"><div className="container"><div className="section-heading"><div><span className="kicker">FIND YOUR SCALE</span><h2>Start with your application.</h2></div></div>{groups.map(group => { const matches = products.filter(product => product.category === group.category || (group.marker === '03' && /complete.*ro|treatment system/i.test(product.category))).slice(0, 3); return <div className="ro-group" key={group.marker}><div className="ro-group-intro"><EditorialPhoto name={group.media} alt={group.title}/><span>{group.marker} / RO SYSTEMS</span><h2>{group.title}</h2><p>{group.description}</p><a href="/Puritech-Botswana-/products">Browse the whole range <ArrowUpRight size={17}/></a></div><div className="ro-group-products">{matches.length ? matches.map(product => <ProductCard key={product.id} product={product} onEnquire={onEnquire}/>) : <div className="ro-consult"><Droplets size={44}/><h3>Built around your water.</h3><p>Tell our team the volume and water source you are working with.</p><button className="under-link" onClick={() => onEnquire(null)}>Ask for a recommendation <ArrowUpRight size={16}/></button></div>}</div></div>; })}</div></section></main>;
}

function SolutionDetail({ page, product, content, edit, isEditor, onEnquire }) {
  const key = `info_${page.slug.replaceAll('-', '_')}`;
  const title = content[`${key}_title`] || page.title;
  const lead = content[`${key}_lead`] || page.lead;
  const image = content[`${key}_image`] || product?.image_url;
  return <main className={`solution-detail theme-${page.theme}`}>
    <section className="solution-cover"><div className="container solution-cover-grid"><div className="solution-cover-copy" data-reveal><a href="/Puritech-Botswana-/solutions" className="back-link">Solutions / <span>{page.title}</span></a><span className="kicker">{page.eyebrow}</span><h1>{title}</h1><p>{lead}</p><button className="btn btn-white" onClick={onEnquire}>Enquire about this <ArrowUpRight size={17}/></button>{isEditor && <EditButton onClick={() => edit([`${key}_title`,`${key}_lead`,`${key}_image`], `Edit ${page.title}`, { [`${key}_title`]: title, [`${key}_lead`]: lead, [`${key}_image`]: image })}/>}</div><div className="solution-cover-art" data-reveal>{image ? <img src={image} alt={page.title} onError={e => {e.currentTarget.style.display='none';}}/> : <Droplets size={150} strokeWidth={0.8}/>}<span>{page.title}</span></div></div></section>
    <section className="solution-insight"><div className="container"><span className="kicker">THE STARTING POINT</span><p>{page.insight}</p></div></section>
    <section className="section solution-process"><div className="container"><div className="solution-section-heading"><span className="kicker">HOW IT COMES TOGETHER</span><h2>A clear path forward.</h2></div><div className="process-grid">{page.steps.map(([number, heading, description]) => <div className="process-card" key={number} data-reveal><span>{number}</span><h3>{heading}</h3><p>{description}</p></div>)}</div></div></section>
    <section className="section solution-equipment"><div className="container equipment-layout"><div><span className="kicker">PART OF THE PLAN</span><h2>Equipment to consider.</h2><p>{page.note}</p><button className="btn btn-blue" onClick={onEnquire}>Plan with Puritech <ArrowUpRight size={17}/></button></div><ul>{page.equipment.map(item => <li key={item}><Check size={18}/>{item}</li>)}</ul></div></section>
    <ImportedContent page={importedPages[page.slug]} content={content} isEditor={isEditor} edit={edit} contentKey={`archive_${page.slug.replaceAll('-', '_')}_body`}/>
    <section className="solution-next"><div className="container"><div><span className="kicker">KEEP EXPLORING</span><h2>Find the right fit for your water.</h2></div><div><a href="/Puritech-Botswana-/products">Browse the product range <ArrowUpRight size={17}/></a></div></div></section>
  </main>;
}

function Journal({ articles, image, content, edit, isEditor }) {
  return <main className="journal-page"><section className="journal-cover" style={image ? {"--hero-photo": "url(" + image + ")"} : {}}><div className="container"><span className="kicker" data-reveal>WATER NOTES / PURITECH BOTSWANA</span><h1 data-reveal>{content.journal_title || 'Ideas for clearer decisions.'}</h1><p data-reveal>{content.journal_description || 'From filtration basics to practical water quality questions, explore articles from the Puritech Botswana archive.'}</p>{isEditor && <EditButton onClick={() => edit(['journal_title','journal_description'], 'Edit journal introduction', { journal_title: 'Ideas for clearer decisions.', journal_description: 'From filtration basics to practical water quality questions, explore articles from the Puritech Botswana archive.' })}/>}</div></section><section className="section journal-content"><div className="container"><div className="journal-lead"><span>THE JOURNAL</span><p>Good decisions begin with understanding what is in your water and what the equipment can do.</p></div><div className="article-grid">{articles.map((article, i) => <a href={`/Puritech-Botswana-/journal/${article.slug}`} className="article-card" key={article.slug} data-reveal><EditorialPhoto name={articleMedia[i]} alt={article.title}/><span className="article-count">{String(i + 1).padStart(2, '0')}</span><span className="kicker">{article.category}</span><h2>{content[`journal_${article.slug}_title`] || article.title}</h2><p>{content[`journal_${article.slug}_teaser`] || article.teaser}</p><span className="article-link">Read the overview <ArrowUpRight size={17}/></span></a>)}</div></div></section></main>;
}

function ArticleDetail({ article, content, edit, isEditor, onEnquire }) {
  const key = `journal_${article.slug}`;
  const title = content[`${key}_title`] || article.title;
  const teaser = content[`${key}_teaser`] || article.teaser;
  const archived = importedPages[article.slug] || importedPages[new URL(article.source).pathname.split('/').filter(Boolean).at(-1)];
  const overview = content[`${key}_body`] || `${article.teaser} Water quality and treatment needs vary by source and intended use. A water analysis and a conversation about your application are the best starting points for selecting equipment.`;
  return <main className="article-detail"><section className="article-cover"><EditorialPhoto name={articleMedia[articles.findIndex(item => item.slug === article.slug)]} alt={article.title} className="article-hero-photo"/><div className="container"><a href="/Puritech-Botswana-/journal" className="back-link">Journal / <span>{article.category}</span></a><span className="kicker" data-reveal>FROM THE PURITECH ARCHIVE</span><h1 data-reveal>{title}</h1><p data-reveal>{teaser}</p>{isEditor && <EditButton onClick={() => edit([`${key}_title`,`${key}_teaser`,`${key}_body`], `Edit ${article.title}`, { [`${key}_title`]: title, [`${key}_teaser`]: teaser, [`${key}_body`]: overview })}/>}</div></section>{archived?.html ? <ImportedContent page={archived} content={content} isEditor={isEditor} edit={edit} contentKey={key + '_body'}/> : <section className="section article-body"><div className="container"><div><span className="kicker">THE OVERVIEW</span><h2>What this topic means for your water.</h2></div><div><p>{overview}</p><p>Speak to our team about how this topic applies to your situation.</p><div className="article-actions"><button className="btn btn-blue" onClick={onEnquire}>Ask our team <ArrowUpRight size={17}/></button></div></div></div></section>}</main>;
}

function readableSourceText(text) {
  return text.replace(/&#(?:0*65533|x0*fffd);/gi, '\ufffd')
    .replace(/ï¿½/g, '\ufffd')
    .replace(/(\d\s*)\ufffd(?=[CF]\b)/g, '$1\u00b0')
    .replace(/(\d\s*)\ufffd(?=m\b)/g, '$1\u00b5')
    .replace(/caf\ufffds/gi, 'caf\u00e9s')
    .replace(/\ufffd+/g, ' ');
}

function cleanTextFields(record, fields) {
  const clean = { ...record };
  for (const field of fields) {
    if (typeof clean[field] === 'string') clean[field] = readableSourceText(clean[field]);
  }
  return clean;
}

function ImportedContent({ page, content, isEditor, edit, contentKey }) {
  if (!page?.html) return null;
  const override = contentKey && content?.[contentKey];
  const originalText = page.html.replace(/<[^>]*>/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  return <section className="section imported-section"><div className="container"><div className="imported-heading"><span className="kicker">MORE INFORMATION</span><h2>{readableSourceText(page.title || 'The full guide')}</h2>{isEditor && contentKey && <EditButton onClick={() => edit([contentKey], `Edit ${page.title || 'page'}`, { [contentKey]: originalText })}/>}</div>{override ? <div className="imported-content">{override.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : <div className="imported-content" dangerouslySetInnerHTML={{ __html: readableSourceText(page.html) }}/>}</div></section>;
}

function EditButton({ onClick }) { return <button className="edit-button" onClick={onClick} aria-label="Edit section"><Edit3 size={15}/> Edit section</button>; }
function PageBanner({ kicker, title, description, image }) { return <div className="page-banner" style={image ? { '--hero-photo': `url("${image}")` } : {}}><div className="container"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div><div className="banner-mark"><Droplets size={260} strokeWidth={.7}/></div></div>; }
function ContactMap({ address }) {
  const isShowroom = address === defaultContent.contact_address;
  const query = encodeURIComponent(isShowroom ? '8V5J+89 Gaborone, Botswana' : address);
  const mapUrl = isShowroom
    ? 'https://www.openstreetmap.org/export/embed.html?bbox=25.872%2C-24.698%2C25.890%2C-24.685&layer=mapnik&marker=-24.6916875%2C25.8809375'
    : 'https://maps.google.com/maps?q=' + query + '&z=16&output=embed';
  return <figure className="location-map">
    <iframe title="Map showing the Puritech Botswana showroom" src={mapUrl} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/>
    <figcaption className="location-map-caption">
      <span><strong>Visit our showroom</strong><small>{address}</small></span>
      <a href={'https://www.google.com/maps/dir/?api=1&destination=' + query} target="_blank" rel="noopener noreferrer">Get directions <ArrowUpRight size={16}/></a>
    </figcaption>
  </figure>;
}
function EditorLogin({ user, isEditor }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signIn(event) {
    event.preventDefault(); setBusy(true); setError('');
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) setError(authError.message);
    else {
      const { data: member, error: memberError } = await supabase.from('editors').select('user_id').eq('user_id', data.user.id).maybeSingle();
      if (memberError || !member) { await supabase.auth.signOut(); setError('This account does not have editor access.'); }
      else navigate('home');
    }
    setBusy(false);
  }
  return <main className="editor-login"><div className="editor-login-card"><span className="kicker">PURITECH / SITE EDITOR</span><h1>Live site editing.</h1><p>Sign in to update products, promotions and page content directly on the website.</p>{user && isEditor ? <div><p>Signed in as {user.email}.</p><button className="btn btn-blue" onClick={() => navigate('home')}>Open live editor</button><button className="editor-signout" onClick={() => supabase.auth.signOut()}>Sign out</button></div> : <form className="editor-form" onSubmit={signIn}><label>Email address<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)}/></label><label>Password<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)}/></label>{error && <p className="form-error" role="alert">{error}</p>}<button className="btn btn-blue" type="submit" disabled={busy}>{busy ? 'Checking.' : 'Sign in to edit'}</button></form>}</div></main>;
}
function ProductCard({ product, onEnquire, actions }) {
  return <article className="product-card" data-reveal>
    <ProductImage product={product} actions={actions}/>
    <div className="product-info"><span className="product-category">{product.category}</span><h3><a href={`/Puritech-Botswana-/product/${product.id}`}>{readableSourceText(product.name)}</a></h3><p>{readableSourceText(product.description || "")}</p><div className="product-card-links"><a href={`/Puritech-Botswana-/product/${product.id}`}>View details</a><button onClick={() => onEnquire(product)}>Enquire <ArrowUpRight size={17}/></button></div></div>
  </article>;
}
function productSources(product, override) {
  const original = product.archive_id ? null : product.image_url;
  const legacy = productPhotos[product.archive_id || product.id];
  const prefersLegacy = !original || /^https:\/\/(?:water\.co\.bw|reverseosmosis\.co\.za)\//i.test(original);
  const sources = override ? [override] : prefersLegacy ? [legacy, original] : [original, legacy];
  return [...new Set(sources.filter(Boolean).flatMap(url => [
    mediaManifest[url] && basePath + mediaManifest[url], url
  ].filter(Boolean)))];
}

function CataloguePhoto({ sources, alt, eager = false }) {
  const [index, setIndex] = useState(0);
  const source = sources[index];
  return source ? <img src={source} key={source} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'} onError={() => setIndex(index + 1)}/> : <Droplets className="catalogue-placeholder" size={58} strokeWidth={1} aria-hidden="true"/>;
}

function ProductImage({ product, actions, eager = false, imageOverride }) {
  const sources = productSources(product, imageOverride);
  return <div className="product-image"><CataloguePhoto key={sources.join('|')} sources={sources} alt={product.name} eager={eager}/>{actions}</div>;
}
function ProductDetail({ product, related, onEnquire, actions, content, isEditor, edit }) {
  const description = readableSourceText(product.description || "").trim();
  const [fullState, setFullState] = useState(null);
  const archiveId = product.archive_id || product.id;
  const full = fullState?.id === archiveId ? fullState.data : null;
  useEffect(() => { let active = true; const load = productDetailModules[`./product-details/${archiveId[0]?.toLowerCase()}.json`]; load?.().then(module => { if (active) setFullState({ id: archiveId, data: module.default[archiveId] || null }); }); return () => { active = false; }; }, [product.id]);
  const detailKey = `product_detail_${product.id.replaceAll('-', '_')}`;
  const liveDetail = content[detailKey];
  const gallery = [...new Set(full?.images?.filter(Boolean) || [])];
  const [selectedImage, setSelectedImage] = useState(null);
  useEffect(() => setSelectedImage(null), [product.id]);
  return <main className="product-detail">
    <div className="container product-breadcrumb"><a href="/Puritech-Botswana-/products">Products</a><span>/</span><span>{product.category}</span></div>
    <section className="container detail-layout"><div className="detail-visual" data-reveal><ProductImage product={product} actions={actions} imageOverride={selectedImage} eager/>{gallery.length > 1 && <div className="detail-thumbnails">{gallery.slice(0, 8).map((url, index) => <button type="button" key={url} className={(selectedImage || gallery[0]) === url ? 'selected' : ''} onClick={() => setSelectedImage(url)} aria-label={`View product image ${index + 1}`}><CataloguePhoto sources={productSources(product, url)} alt=""/></button>)}</div>}</div><div className="detail-copy" data-reveal><span className="kicker">{product.category}</span><h1>{readableSourceText(product.name)}</h1>{description && <p className="detail-intro">{description}</p>}{full?.sku && <p className="product-sku">Reference: {readableSourceText(full.sku)}</p>}<div className="detail-facts"><span><Check size={18}/> Product enquiry</span><span><Check size={18}/> Botswana support</span></div><button className="btn btn-blue" onClick={() => onEnquire(product)}>Enquire about this product <ArrowUpRight size={17}/></button></div></section>
    <section className="section detail-description"><div className="container detail-description-grid"><div><span className="kicker">PRODUCT INFORMATION</span><h2>Product details</h2>{isEditor && <EditButton onClick={() => edit([detailKey], `Edit details for ${product.name}`, { [detailKey]: full?.html?.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() || description || '' })}/>}</div><div className="product-description-panel">{liveDetail ? <div className="imported-content">{liveDetail.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div> : full?.html ? <div className="imported-content" dangerouslySetInnerHTML={{ __html: readableSourceText(full.html) }}/> : description ? description.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : <p>Contact our team for this product's specifications and suitability for your water treatment needs.</p>}{full?.attributes?.length > 0 && <dl className="detail-attributes">{full.attributes.map(([label, values]) => <div key={label}><dt>{readableSourceText(label)}</dt><dd>{readableSourceText(values)}</dd></div>)}</dl>}</div></div></section>
    {related.length > 0 && <section className="section related-products"><div className="container"><div className="section-heading"><div><span className="kicker">KEEP EXPLORING</span><h2>More in {product.category}.</h2></div><a href="/Puritech-Botswana-/products" className="under-link">All products <ArrowUpRight size={16}/></a></div><div className="product-grid">{related.map(item => <ProductCard key={item.id} product={item} onEnquire={onEnquire}/>)}</div></div></section>}
  </main>;
}
function EnquiryForm({ product, email, inline = false }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [opened, setOpened] = useState(false);
  const [formError, setFormError] = useState('');
  const send = e => {
    e.preventDefault();
    const name = form.name.trim(), message = form.message.trim(), phone = form.phone.trim();
    if (name.length < 2 || message.length < 10) { setFormError('Enter your name and at least 10 characters about your enquiry.'); return; }
    if (phone && !/^[+0-9() .-]{7,24}$/.test(phone)) { setFormError('Enter a valid phone number or leave it blank.'); return; }
    setFormError('');
    const subject = product ? `Product enquiry: ${product.name}` : 'Water treatment enquiry';
    const body = `Hello Puritech Botswana,\n\n${product ? `I would like to enquire about: ${product.name}\nProduct reference: ${product.id || product.name}\n` : ''}${message}\n\nMy details:\nName: ${name}\nEmail: ${form.email.trim()}\nPhone: ${phone || 'Not provided'}\n\nPlease contact me with more information.\n`;
    setOpened(true);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  return <form className={inline ? 'enquiry-form inline-form' : 'enquiry-form'} onSubmit={send}><div className="form-row"><label>Your name <input required minLength={2} maxLength={100} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name"/></label><label>Email address <input type="email" required maxLength={254} autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/></label></div><label>Phone number <input type="tel" maxLength={24} autoComplete="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional"/></label>{product && <div className="selected-product"><Check size={17}/> Enquiring about <strong>{product.name}</strong></div>}<label>How can we help? <textarea required minLength={10} maxLength={2000} rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you need, your location, quantity or any specifications."/></label>{formError && <p className="form-error" role="alert">{formError}</p>}<button className="btn btn-blue" type="submit">Open email app <ArrowUpRight size={17}/></button><small>Your email app opens with the message prepared. Review it and press Send there.</small>{opened && <p className="mail-note" role="status">Email app opened? Please press Send in your email app to complete your enquiry. If nothing opened, email <a href={`mailto:${email}`}>{email}</a>.</p>}</form>;
}

function EditorModal({ modal, onClose, onSaved, saveContent, saveProduct, savePromotion, categories, isEditor, user, cmsReady, flash }) {
  const [item, setItem] = useState(modal.item || {});
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const update = (key, value) => setItem(previous => ({ ...previous, [key]: value }));
  const doUpload = async (file, key) => { if (!file) return; setUploading(true); setError(''); try { update(key, await uploadImage(file)); } catch (err) { setError(err.message); } finally { setUploading(false); } };
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try {
      if (modal.kind === 'login') { const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError; onClose(); flash('Signed in.'); }
      else if (!isEditor) throw new Error('Your account does not have editor access.');
      else if (!cmsReady) throw new Error('CMS tables are not installed yet. Run the database setup in README.md.');
      else { if (modal.kind === 'content') await saveContent(item); if (modal.kind === 'product') await saveProduct(item); if (modal.kind === 'promotion') await savePromotion(item); onSaved(); }
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }
  const field = (key, label, type = 'text') => <label key={key}>{label}{type === 'textarea' ? <textarea rows="4" required={['description','subtitle'].includes(key)} maxLength={key.endsWith('_body') || key.startsWith('product_detail_') ? 100000 : key === 'description' ? 8000 : 3000} value={item[key] || ''} onChange={e => update(key, e.target.value)}/> : <input type={key === 'source_url' ? 'url' : key === 'contact_email' ? 'email' : type} required={['name','title','contact_email'].includes(key) || key.endsWith('_title')} maxLength={key === 'source_url' ? 2000 : key === 'contact_email' ? 254 : 240} value={item[key] || ''} onChange={e => update(key, e.target.value)}/>}</label>;
  const imageField = key => <label className="upload-label" key={key}><span>Image</span><span className="upload-box"><ImagePlus size={25}/>{uploading ? 'Uploading image.' : item[key] ? 'Replace uploaded image' : 'Choose image to upload'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => doUpload(e.target.files[0], key)} disabled={uploading}/></span>{item[key] && <img className="upload-preview" src={item[key]} alt="Current selection"/>}</label>;
  const labels = { hero_eyebrow: 'Small heading', hero_title: 'Main heading', hero_description: 'Description', intro_title: 'Heading', intro_description: 'Description', about_title: 'Page heading', about_description: 'Company story', contact_title: 'Page heading', contact_description: 'Description', contact_email: 'Public email', contact_phone: 'Phone', contact_phone_secondary: 'Alternative phone', contact_address: 'Address' };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal editor-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button><span className="kicker">{modal.kind === 'login' ? 'SITE EDITOR' : 'LIVE PAGE EDITING'}</span><h2>{modal.title || (modal.kind === 'login' ? user ? 'Editor account' : 'Sign in to edit' : modal.kind === 'product' ? 'Edit product' : 'Edit promotion')}</h2>{modal.kind === 'login' && user ? <div><p>Signed in as {user.email}.</p><p>{isEditor ? 'Your editor controls are active.' : 'This account is not in the editors list.'}</p><button className="btn btn-outline-dark" onClick={async () => { await supabase.auth.signOut(); onClose(); }}>Sign out</button></div> : <form onSubmit={submit} className="editor-form">
    {modal.kind === 'login' && <>{fieldLogin('Email address', email, setEmail, 'email')}{fieldLogin('Password', password, setPassword, 'password')}</>}
    {modal.kind === 'content' && modal.fields.map(key => key.endsWith('_image') ? imageField(key) : field(key, labels[key] || (key.endsWith('_lead') || key.endsWith('_description') || key.endsWith('_teaser') || key.endsWith('_body') ? 'Description' : 'Page heading'), (key.startsWith('product_detail_') || ['hero_description','intro_description','about_description','contact_description'].includes(key)) || ['_lead','_description','_teaser','_body'].some(suffix => key.endsWith(suffix)) ? 'textarea' : 'text'))}
    {modal.kind === 'product' && <>{field('name','Product name')}{field('description','Description','textarea')}<label>Category<input required maxLength={120} list="product-categories" value={item.category || ''} onChange={e => update('category', e.target.value)}/><datalist id="product-categories">{categories.slice(1).map(c => <option key={c} value={c}/>)}</datalist></label>{imageField('image_url')}<label className="check-label"><input type="checkbox" checked={item.featured || false} onChange={e => update('featured', e.target.checked)}/> Show on home page</label><label className="check-label"><input type="checkbox" checked={item.active !== false} onChange={e => update('active', e.target.checked)}/> Published</label></>}
    {modal.kind === 'promotion' && <>{field('title','Promotion title')}{field('subtitle','Description','textarea')}{imageField('image_url')}{field('cta_label','Button text')}<label className="check-label"><input type="checkbox" checked={item.active !== false} onChange={e => update('active', e.target.checked)}/> Published on home page</label></>}
    {error && <p className="form-error" role="alert">{error}</p>}{!cmsReady && modal.kind !== 'login' && <p className="form-error">CMS setup is pending. See README.md.</p>}<button className="btn btn-blue" type="submit" disabled={busy || uploading}>{busy ? 'Saving.' : modal.kind === 'login' ? 'Sign in' : 'Publish changes'} <ArrowUpRight size={17}/></button>
  </form>}</div></div>;
}
function fieldLogin(label, value, onChange, type) { return <label>{label}<input required type={type} value={value} onChange={e => onChange(e.target.value)}/></label>; }

export default App;
