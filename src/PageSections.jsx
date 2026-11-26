import React from 'react';

export function serializeSection(item) {
  const { key, ...section } = item;
  for (const field of ['title', 'body', 'alt', 'linkLabel', 'linkUrl']) section[field] = (section[field] || '').trim();
  section.order = Number(section.order ?? 0);
  if (!section.title && !section.body && !section.image_url) throw new Error('Add a heading, text, or image.');
  if (Boolean(section.linkLabel) !== Boolean(section.linkUrl) || (section.linkUrl && !/^https:\/\/[^\s]+$/.test(section.linkUrl))) {
    throw new Error('Enter both a button label and an HTTPS link.');
  }
  if (!Number.isInteger(section.order) || section.order < 0 || section.order > 9999) throw new Error('Enter a display order from 0 to 9999.');
  const value = JSON.stringify(section);
  if (value.length > 12000 || key.length > 120) throw new Error('This section exceeds the CMS storage limit.');
  return value;
}

export function PageSections({ scope, position, content, isEditor, onEdit, onDelete }) {
  const prefix = 'section:' + scope + ':' + position + ':';
  const sections = Object.entries(content).flatMap(([key, value]) => {
    if (!key.startsWith(prefix)) return [];
    try {
      const section = JSON.parse(value);
      if (!section || typeof section !== 'object' || (!isEditor && section.active === false)) return [];
      return [{ ...section, key }];
    } catch {
      return [];
    }
  }).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.key.localeCompare(b.key));
  if (!sections.length && !isEditor) return null;
  const locationLabel = (scope === 'site' ? 'site-wide' : 'page') + ' ' + position;
  return <div className="container cms-sections">
    {sections.map(section => <section className="cms-section" key={section.key}>
      {section.image_url && <img src={section.image_url} alt={section.alt || ''} loading={position === 'top' ? 'eager' : 'lazy'} decoding="async"/>}
      <div>
        {section.title && <h2>{section.title}</h2>}
        {section.body && section.body.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {section.linkLabel && /^https:\/\/[^\s]+$/.test(section.linkUrl) && <a className="btn btn-blue" href={section.linkUrl}>{section.linkLabel}</a>}
        {isEditor && <div className="cms-section-tools">
          {section.active === false && <small>Hidden from visitors</small>}
          <button className="edit-button" type="button" onClick={() => onEdit(section)}>Edit section</button>
          <button className="edit-button" type="button" onClick={() => onDelete(section)}>Remove section</button>
        </div>}
      </div>
    </section>)}
    {isEditor && <button className="edit-button" type="button" onClick={() => onEdit({
      key: prefix + crypto.randomUUID(), order: Math.min(9999, (sections.at(-1)?.order ?? -1) + 1), active: false
    })}>Add section · {locationLabel}</button>}
  </div>;
}
