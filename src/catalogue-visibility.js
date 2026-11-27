const removedCategories = new Set([
  'air coolers',
  'borehole pumps',
  'coffee machines',
  'hydrogen rich water cups',
  'marketing products',
  'plastic tanks',
  'solar inverters solar products',
  'solar panels',
]);

export function isPublicProduct(product) {
  const category = String(product.category ?? '').trim().toLowerCase();
  return product.active !== false
    && !removedCategories.has(category)
    && !/\b(?:hydrometers?|hydrogen[ -]+rich[ -]+water[ -]+cups?)\b/i.test(product.name ?? '');
}
