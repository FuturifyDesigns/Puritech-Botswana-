import React, { useEffect, useMemo, useState } from 'react';
import gsap from 'gsap';
import { ArrowUpRight, Check, ChevronDown, Droplets, Edit3, Filter, ImagePlus, Mail, MapPin, Menu, Phone, Plus, Search, Settings2, ShieldCheck, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { defaultContent, initialProducts } from './data';
import { supabase, uploadImage } from './supabase';

const emptyProduct = { name: '', category: 'RO Home Use', description: '', image_url: '', source_url: '', featured: false, active: true, sort_order: 0 };
const emptyPromotion = { title: '', subtitle: '', image_url: '', cta_label: 'Enquire now', active: true, sort_order: 0 };

function App() {
  const [page, setPage] = useState(location.hash.replace('#/', '') || 'home');
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

  useEffect(() => {
    const onHash = () => { setPage(location.hash.replace('#/', '') || 'home'); setMobileMenu(false); window.scrollTo(0, 0); };
    addEventListener('hashchange', onHash);
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => { removeEventListener('hashchange', onHash); subscription.unsubscribe(); };
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
      if (p.error || o.error || c.error) { setCmsReady(false); return; }
      setCmsReady(true);
      if (p.data?.length) setProducts(p.data);
      setPromotions(o.data || []);
      setContent({ ...defaultContent, ...Object.fromEntries((c.data || []).map(({ key, value }) => [key, value])) });
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!user) { setIsEditor(false); return; }
    supabase.from('editors').select('user_id').eq('user_id', user.id).maybeSingle().then(({ data }) => setIsEditor(Boolean(data)));
  }, [user]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-reveal]', { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.09, ease: 'power2.out', clearProps: 'all' });
    });
    return () => ctx.revert();
  }, [page]);

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
    const payload = { ...item }; delete payload.created_at;
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
  const edit = (fields, title) => setModal({ kind: 'content', title, fields, item: Object.fromEntries(fields.map(f => [f, content[f] || ''])) });
  const chooseCategory = value => { setCategory(value); setVisibleCount(24); location.hash = '/products'; };
  const productActions = item => isEditor && <div className="card-edit"><button aria-label={`Edit ${item.name}`} onClick={e => { e.stopPropagation(); setModal({ kind: 'product', item }); }}><Edit3 size={15}/></button><button aria-label={`Delete ${item.name}`} onClick={e => { e.stopPropagation(); remove('product', item); }}><Trash2 size={15}/></button></div>;

  return <>
    <div className="topline"><div className="container top-inner"><span>Water treatment expertise since 2007</span><span><a href={`tel:${content.contact_phone.replace(/\s/g, '')}`}>{content.contact_phone}</a><i/> <a href={`mailto:${content.contact_email}`}>{content.contact_email}</a></span></div></div>
    <header className="site-header"><div className="container nav-inner">
      <a className="brand" href="#/home" aria-label="Puritech Botswana home"><span className="brand-symbol"><Droplets size={29} strokeWidth={2.6}/></span><span className="brand-text">PURITECH<small>BOTSWANA</small></span></a>
      <nav className={mobileMenu ? 'nav-links open' : 'nav-links'} aria-label="Main navigation">
        {[['Home','home'],['Products','products'],['About us','about'],['Contact','contact']].map(([label, path]) => <a className={page === path ? 'active' : ''} key={path} href={`#/${path}`}>{label}</a>)}
      </nav>
      <div className="nav-actions"><button className="text-button" onClick={() => setModal({ kind: 'login' })}>{isEditor ? <><Settings2 size={17}/> Edit site</> : user ? 'Account' : 'Editor sign in'}</button><button className="btn btn-dark nav-enquire" onClick={() => setEnquireProduct(null)}>Request a quote <ArrowUpRight size={17}/></button><button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X/> : <Menu/>}</button></div>
    </div></header>
    {isEditor && <div className="editor-strip"><div className="container"><span><span className="live-dot"/> LIVE EDIT MODE</span><span>Click any pencil to update the page. Changes appear immediately.</span><div><button onClick={() => setModal({ kind: 'product', item: { ...emptyProduct, sort_order: products.length } })}><Plus size={15}/> Product</button><button onClick={() => setModal({ kind: 'promotion', item: { ...emptyPromotion, sort_order: promotions.length } })}><Plus size={15}/> Promotion</button><button onClick={async () => { await supabase.auth.signOut(); flash('Signed out.'); }}>Sign out</button></div></div></div>}
    {page === 'home' && <main>
      <section className="hero"><div className="container hero-grid"><div className="hero-copy" data-reveal><div className="eyebrow"><span className="eyebrow-line"/>{content.hero_eyebrow}</div><h1>{content.hero_title}</h1><p>{content.hero_description}</p><div className="hero-buttons"><a className="btn btn-blue" href="#/products">Explore products <ArrowUpRight size={18}/></a><button className="btn btn-outline" onClick={() => setEnquireProduct(null)}>Talk to an expert</button></div><div className="hero-foot"><span><strong>2007</strong> Established in Botswana</span><span className="foot-divider"/><span><strong>Home to industry</strong> Solutions for every scale</span></div>{isEditor && <EditButton onClick={() => edit(['hero_eyebrow','hero_title','hero_description','hero_image'], 'Edit hero')}/>}</div><div className="hero-visual" data-reveal><div className="hero-orbit orbit-one"/><div className="hero-orbit orbit-two"/><div className="hero-product"><img src={content.hero_image} alt="Industrial reverse osmosis water treatment system"/></div><div className="hero-stamp"><Droplets size={19}/><span>PURE WATER<br/><strong>BETTER FUTURE</strong></span></div></div></div><div className="hero-index">PURITECH / 01</div></section>
      <section className="value-bar"><div className="container value-grid"><div><span className="value-icon"><Droplets/></span><span><strong>Water that works harder</strong><small>Equipment for every application</small></span></div><div><span className="value-icon"><ShieldCheck/></span><span><strong>Trusted expertise</strong><small>Local support since 2007</small></span></div><div><span className="value-icon"><Filter/></span><span><strong>Built around your needs</strong><small>Talk to us before you choose</small></span></div></div></section>
      {activePromos.length > 0 && <section className="promos-section section"><div className="container"><div className="section-heading"><div><span className="kicker">WHAT'S HAPPENING</span><h2>Offers & announcements</h2></div></div><div className="promo-grid">{activePromos.map(p => <div className="promo-card" key={p.id} style={p.image_url ? { backgroundImage: `linear-gradient(90deg,rgba(4,26,47,.85),rgba(4,26,47,.12)),url("${p.image_url}")` } : {}}><div><span className="kicker">PURITECH BOTSWANA</span><h3>{p.title}</h3><p>{p.subtitle}</p><button className="btn btn-white" onClick={() => setEnquireProduct({ name: p.title })}>{p.cta_label || 'Enquire now'} <ArrowUpRight size={17}/></button></div>{isEditor && <div className="card-edit"><button onClick={() => setModal({ kind: 'promotion', item: p })}><Edit3 size={15}/></button><button onClick={() => remove('promotion', p)}><Trash2 size={15}/></button></div>}</div>)}</div></div></section>}
      <section className="section intro-section"><div className="container intro-grid"><div data-reveal><span className="kicker">THE PURITECH APPROACH</span><h2>{content.intro_title}</h2>{isEditor && <EditButton onClick={() => edit(['intro_title','intro_description'], 'Edit introduction')}/>}</div><div data-reveal><p>{content.intro_description}</p><a className="under-link" href="#/about">Get to know us <ArrowUpRight size={17}/></a></div></div></section>
      <section className="section product-section"><div className="container"><div className="section-heading" data-reveal><div><span className="kicker">EXPLORE THE RANGE</span><h2>Solutions for every drop.</h2></div><a className="under-link" href="#/products">View all products <ArrowUpRight size={17}/></a></div><div className="category-pills" data-reveal>{categories.slice(1, 6).map(c => <button key={c} onClick={() => chooseCategory(c)}>{c}<ArrowUpRight size={14}/></button>)}</div><div className="product-grid">{featured.map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div></div></section>
      <section className="editorial"><div className="container editorial-inner"><div><span className="kicker">MORE THAN EQUIPMENT</span><h2>Water problems are different.<br/><em>So are the solutions.</em></h2><p>Whether you're planning a household installation or a large treatment project, we can help you work out what fits.</p><button className="btn btn-white" onClick={() => setEnquireProduct(null)}>Tell us what you need <ArrowUpRight size={17}/></button></div><div className="editorial-art"><div className="art-ring"/><Droplets size={120} strokeWidth={1}/></div></div></section>
    </main>}
    {page === 'products' && <main><PageBanner kicker="THE PRODUCT RANGE" title="Find your water solution." description="Explore our full equipment range. Need guidance? Send an enquiry and our team will help."/><section className="section catalogue"><div className="container"><div className="catalogue-tools"><label className="search-box"><Search size={19}/><input placeholder="Search products" value={search} onChange={e => { setSearch(e.target.value); setVisibleCount(24); }}/></label><label className="select-wrap"><SlidersHorizontal size={18}/><select value={category} onChange={e => { setCategory(e.target.value); setVisibleCount(24); }}>{categories.map(c => <option key={c}>{c}</option>)}</select><ChevronDown size={16}/></label><span className="result-count">{filtered.length} products</span></div><div className="catalogue-layout"><aside className="category-sidebar"><span className="kicker">CATEGORIES</span>{categories.map(c => <button key={c} className={category === c ? 'selected' : ''} onClick={() => { setCategory(c); setVisibleCount(24); }}>{c}<span>{c === 'All products' ? activeProducts.length : activeProducts.filter(p => p.category === c).length}</span></button>)}</aside><div>{filtered.length ? <div className="product-grid catalogue-grid">{filtered.slice(0, visibleCount).map(p => <ProductCard key={p.id} product={p} onEnquire={setEnquireProduct} actions={productActions(p)}/>)}</div> : <div className="empty-state">No products match that search. Try a different category or <button onClick={() => {setSearch('');setCategory('All products');}}>clear filters</button>.</div>}{filtered.length > visibleCount && <div className="load-more"><button className="btn btn-outline-dark" onClick={() => setVisibleCount(count => count + 24)}>Show more products</button><span>Showing {Math.min(visibleCount, filtered.length)} of {filtered.length}</span></div>}</div></div></div></section></main>}
    {page === 'about' && <main><PageBanner kicker="ABOUT PURITECH BOTSWANA" title={content.about_title} description="Local knowledge. Serious water expertise."/>{isEditor && <div className="container page-edit"><EditButton onClick={() => edit(['about_title','about_description'], 'Edit about page')}/></div>}<section className="section about-layout"><div className="container"><div className="about-copy"><span className="kicker">OUR STORY</span><h2>Since 2007, working toward better water.</h2><p>{content.about_description}</p><p>We supply replacement filters, reverse osmosis membranes, housings, FRP vessels, filtration media, domestic systems and industrial equipment.</p><button className="btn btn-blue" onClick={() => setEnquireProduct(null)}>Discuss your project <ArrowUpRight size={17}/></button></div><div className="about-panel"><span>01 / BOTSWANA</span><Droplets size={90} strokeWidth={1.1}/><h3>Practical expertise.<br/>Clearer outcomes.</h3><p>From a glass of water at home to high-volume treatment systems.</p></div></div></section></main>}
    {page === 'contact' && <main><PageBanner kicker="CONTACT OUR TEAM" title={content.contact_title} description={content.contact_description}/>{isEditor && <div className="container page-edit"><EditButton onClick={() => edit(['contact_title','contact_description','contact_email','contact_phone','contact_address'], 'Edit contact details')}/></div>}<section className="section contact-section"><div className="container contact-layout"><div><span className="kicker">WE'RE HERE TO HELP</span><h2>Start the conversation.</h2><p>Tell us about the water challenge, the product you have in mind, or the project you are planning.</p><div className="contact-items"><a href={`mailto:${content.contact_email}`}><Mail/><span><small>EMAIL US</small>{content.contact_email}</span></a><a href={`tel:${content.contact_phone.replace(/\s/g,'')}`}><Phone/><span><small>CALL US</small>{content.contact_phone}</span></a><div><MapPin/><span><small>VISIT US</small>{content.contact_address}</span></div></div><small className="hours">Monday - Friday � 8:00 AM - 5:00 PM</small></div><EnquiryForm product={null} email={content.contact_email} inline/></div></section></main>}
    <footer className="footer"><div className="container footer-grid"><div><a className="brand footer-brand" href="#/home"><span className="brand-symbol"><Droplets size={27}/></span><span className="brand-text">PURITECH<small>BOTSWANA</small></span></a><p>Water treatment solutions for homes, businesses and industry across Botswana.</p></div><div><strong>Explore</strong><a href="#/home">Home</a><a href="#/products">Products</a><a href="#/about">About us</a><a href="#/contact">Contact</a></div><div><strong>Get in touch</strong><a href={`mailto:${content.contact_email}`}>{content.contact_email}</a><a href={`tel:${content.contact_phone.replace(/\s/g,'')}`}>{content.contact_phone}</a><span>Gaborone, Botswana</span></div></div><div className="container footer-bottom"><a href="https://futurifydesigns.com/" target="_blank" rel="noopener noreferrer">Built by Futurify Designs</a><span>c {new Date().getFullYear()} Puritech Botswana. All rights reserved.</span></div></footer>
    {notice && <div className="toast" role="status">{notice}</div>}
    {enquireProduct !== undefined && enquireProduct !== null && <div className="modal-backdrop" onMouseDown={() => setEnquireProduct(undefined)}><div className="modal enquiry-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEnquireProduct(undefined)} aria-label="Close"><X/></button><span className="kicker">REQUEST AN ENQUIRY</span><h2>Let's find the right fit.</h2><EnquiryForm product={enquireProduct} email={content.contact_email}/></div></div>}
    {enquireProduct === null && <div className="modal-backdrop" onMouseDown={() => setEnquireProduct(undefined)}><div className="modal enquiry-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={() => setEnquireProduct(undefined)} aria-label="Close"><X/></button><span className="kicker">REQUEST AN ENQUIRY</span><h2>Let's find the right fit.</h2><EnquiryForm product={null} email={content.contact_email}/></div></div>}
    {modal && <EditorModal modal={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); flash('Changes published.'); }} saveContent={saveContent} saveProduct={saveProduct} savePromotion={savePromotion} categories={categories} isEditor={isEditor} user={user} cmsReady={cmsReady} flash={flash}/>}
  </>;
}

function EditButton({ onClick }) { return <button className="edit-button" onClick={onClick} aria-label="Edit section"><Edit3 size={15}/> Edit section</button>; }
function PageBanner({ kicker, title, description }) { return <div className="page-banner"><div className="container"><span className="kicker">{kicker}</span><h1>{title}</h1><p>{description}</p></div><div className="banner-mark"><Droplets size={260} strokeWidth={.7}/></div></div>; }
function ProductCard({ product, onEnquire, actions }) { return <article className="product-card" data-reveal><div className="product-image">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" onError={e => { e.currentTarget.style.display='none'; e.currentTarget.parentNode.classList.add('no-image'); }}/> : null}<Droplets className="product-placeholder" size={75} strokeWidth={1}/><span className="product-category">{product.category}</span>{actions}</div><div className="product-info"><h3>{product.name}</h3><p>{product.description}</p><button onClick={() => onEnquire(product)}>Enquire about this <ArrowUpRight size={17}/></button></div></article>; }

function EnquiryForm({ product, email, inline = false }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [opened, setOpened] = useState(false);
  const send = e => {
    e.preventDefault();
    const subject = product ? `Product enquiry: ${product.name}` : 'Water treatment enquiry';
    const body = `Hello Puritech Botswana,\n\n${product ? `I would like to enquire about: ${product.name}\n${product.source_url ? `Product reference: ${product.source_url}\n` : ''}\n` : ''}${form.message}\n\nMy details:\nName: ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone || 'Not provided'}\n\nPlease contact me with more information.\n`;
    setOpened(true);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };
  return <form className={inline ? 'enquiry-form inline-form' : 'enquiry-form'} onSubmit={send}><div className="form-row"><label>Your name <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your full name"/></label><label>Email address <input type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com"/></label></div><label>Phone number <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="Optional"/></label>{product && <div className="selected-product"><Check size={17}/> Enquiring about <strong>{product.name}</strong></div>}<label>How can we help? <textarea required rows="4" value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} placeholder="Tell us what you need, your location, quantity or any specifications."/></label><button className="btn btn-blue" type="submit">Open email app <ArrowUpRight size={17}/></button><small>Your email app opens with the message prepared. Review it and press Send there.</small>{opened && <p className="mail-note" role="status">Email app opened? Please press Send in your email app to complete your enquiry. If nothing opened, email <a href={`mailto:${email}`}>{email}</a>.</p>}</form>;
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
  const field = (key, label, type = 'text') => <label key={key}>{label}{type === 'textarea' ? <textarea rows="4" value={item[key] || ''} onChange={e => update(key, e.target.value)}/> : <input type={type} value={item[key] || ''} onChange={e => update(key, e.target.value)}/>}</label>;
  const imageField = key => <label className="upload-label" key={key}><span>Image</span><span className="upload-box"><ImagePlus size={25}/>{uploading ? 'Uploading image.' : item[key] ? 'Replace uploaded image' : 'Choose image to upload'}<input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => doUpload(e.target.files[0], key)} disabled={uploading}/></span>{item[key] && <img className="upload-preview" src={item[key]} alt="Current selection"/>}</label>;
  const labels = { hero_eyebrow: 'Small heading', hero_title: 'Main heading', hero_description: 'Description', intro_title: 'Heading', intro_description: 'Description', about_title: 'Page heading', about_description: 'Company story', contact_title: 'Page heading', contact_description: 'Description', contact_email: 'Public email', contact_phone: 'Phone', contact_address: 'Address' };
  return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal editor-modal" onMouseDown={e => e.stopPropagation()}><button className="modal-close" onClick={onClose} aria-label="Close"><X/></button><span className="kicker">{modal.kind === 'login' ? 'SITE EDITOR' : 'LIVE PAGE EDITING'}</span><h2>{modal.title || (modal.kind === 'login' ? user ? 'Editor account' : 'Sign in to edit' : modal.kind === 'product' ? 'Edit product' : 'Edit promotion')}</h2>{modal.kind === 'login' && user ? <div><p>Signed in as {user.email}.</p><p>{isEditor ? 'Your editor controls are active.' : 'This account is not in the editors list.'}</p><button className="btn btn-outline-dark" onClick={async () => { await supabase.auth.signOut(); onClose(); }}>Sign out</button></div> : <form onSubmit={submit} className="editor-form">
    {modal.kind === 'login' && <>{fieldLogin('Email address', email, setEmail, 'email')}{fieldLogin('Password', password, setPassword, 'password')}</>}
    {modal.kind === 'content' && modal.fields.map(key => key.endsWith('_image') ? imageField(key) : field(key, labels[key] || key, ['hero_description','intro_description','about_description','contact_description'].includes(key) ? 'textarea' : 'text'))}
    {modal.kind === 'product' && <>{field('name','Product name')}{field('description','Description','textarea')}<label>Category<select value={item.category} onChange={e => update('category', e.target.value)}>{categories.slice(1).map(c => <option key={c}>{c}</option>)}</select></label>{imageField('image_url')}{field('source_url','Original product page (optional)')}<label className="check-label"><input type="checkbox" checked={item.featured || false} onChange={e => update('featured', e.target.checked)}/> Show on home page</label><label className="check-label"><input type="checkbox" checked={item.active !== false} onChange={e => update('active', e.target.checked)}/> Published</label></>}
    {modal.kind === 'promotion' && <>{field('title','Promotion title')}{field('subtitle','Description','textarea')}{imageField('image_url')}{field('cta_label','Button text')}<label className="check-label"><input type="checkbox" checked={item.active !== false} onChange={e => update('active', e.target.checked)}/> Published on home page</label></>}
    {error && <p className="form-error" role="alert">{error}</p>}{!cmsReady && modal.kind !== 'login' && <p className="form-error">CMS setup is pending. See README.md.</p>}<button className="btn btn-blue" type="submit" disabled={busy || uploading}>{busy ? 'Saving.' : modal.kind === 'login' ? 'Sign in' : 'Publish changes'} <ArrowUpRight size={17}/></button>
  </form>}</div></div>;
}
function fieldLogin(label, value, onChange, type) { return <label>{label}<input required type={type} value={value} onChange={e => onChange(e.target.value)}/></label>; }

export default App;
