// Curated source entries from water.co.bw. The full WooCommerce export remains pending.
export const categories = [
  'All products', 'RO Home Use', 'RO Industrial', 'Water Dispensers', 'Filter Cartridges',
  'Filter Housings', 'Pumps', 'FRP Vessels', 'Ultrafiltration Systems', 'Filling Tables',
  'Water Softeners', 'Solar Products', 'Bottles', 'Faucets', 'Other equipment'
];

const photo = {
  home: 'https://reverseosmosis.co.za/cdn/shop/files/600GPD-RO-System-1.jpg?v=1749558375&width=1100',
  aqua: 'https://reverseosmosis.co.za/cdn/shop/files/Aqua-Care-600GPD-Domestic-RO-System-2.jpg?v=1770115138',
  industrial: 'https://reverseosmosis.co.za/cdn/shop/files/4000-gpd-compact-ro-system.jpg?v=1749558809',
  house: 'https://reverseosmosis.co.za/cdn/shop/products/wholuhouse-water-filtration-system-with-uv_1044x.jpg?v=1638255363',
  compact: 'https://reverseosmosis.co.za/cdn/shop/files/50GPD-CG-Compact-RO-System-1.jpg?v=1749558359'
};

export const initialProducts = [
  ['600GPD Aqua Care RO System', 'RO Home Use', 'High capacity domestic reverse osmosis system for a home or small office.', photo.aqua, 'https://water.co.bw/shop/'],
  ['Aqua Formosa 75 GPD Domestic RO System with Pump', 'RO Home Use', 'Under-sink water purification with a booster pump for lower pressure homes.', photo.compact, 'https://water.co.bw/shop/'],
  ['Aqua Care 400GPD Domestic RO System', 'RO Home Use', 'Compact reverse osmosis system for clean drinking water.', photo.home, 'https://water.co.bw/shop/'],
  ['6000 LPH Industrial Reverse Osmosis System', 'RO Industrial', 'High-capacity water treatment for commercial and industrial operations.', photo.industrial, 'https://water.co.bw/shop/'],
  ['500l/h RO System On Skid System', 'RO Industrial', 'Skid-mounted reverse osmosis equipment for larger water needs.', photo.industrial, 'https://water.co.bw/product-category/complete-ro-water-treatment-systems/'],
  ['Whole House System Grey - Stand Model', 'Filter Housings', 'Multi-stage filtration for water throughout the home.', photo.house, 'https://water.co.bw/shop/'],
  ['Whole House System Stainless Steel - Stand Model', 'Filter Housings', 'Durable whole-house filtration with a stainless-steel stand.', photo.house, 'https://water.co.bw/'],
  ['Ultrafiltration Water Purifier Pot UF19', 'Ultrafiltration Systems', 'Compact countertop purification with a hollow-fibre membrane.', '', 'https://water.co.bw/shop/'],
  ['Water Dispenser LRX5-2-178L With Cabinet', 'Water Dispensers', 'Hot and cold water dispenser with cabinet for shared spaces.', '', 'https://water.co.bw/shop/'],
  ['PureWater 844 FRP Vessel 2.5?', 'FRP Vessels', 'Fibreglass vessel for commercial softening and filtration.', '', 'https://water.co.bw/shop/'],
  ['AUTO-ADAPTABLE CONTROLLER KG6-1100(S)', 'Pumps', 'Automatic pump control for changing pressure conditions.', '', 'https://water.co.bw/shop/'],
  ['Double Tap Stainless Steel Filling Table', 'Filling Tables', 'Two-tap filling table for water production operations.', '', 'https://water.co.bw/shop/'],
  ['Single Tap Stainless Steel Filling Table', 'Filling Tables', 'Stainless-steel filling station with a single tap.', '', 'https://water.co.bw/shop/'],
  ['SS304 Faucet 380gr 80mm', 'Faucets', 'Stainless-steel faucet for domestic and commercial water systems.', '', 'https://water.co.bw/shop/'],
  ['4040 x2 FRP Membrane Housing', 'Filter Housings', 'Membrane housing for reverse osmosis equipment.', '', 'https://water.co.bw/'],
  ['10000 LPH RO System', 'RO Industrial', 'Industrial reverse osmosis system for high-volume supply.', photo.industrial, 'https://water.co.bw/']
].map(([name, category, description, image_url, source_url], i) => ({
  id: `source-${i + 1}`, name, category, description, image_url, source_url, featured: i < 6, active: true, sort_order: i
}));

export const defaultContent = {
  hero_eyebrow: 'WATER TREATMENT SPECIALISTS � BOTSWANA',
  hero_title: 'Better water. Better living.',
  hero_description: 'From the kitchen tap to industrial-scale treatment, find the right water solution with people who know the work.',
  hero_image: photo.industrial,
  intro_title: 'A clearer way to find your water solution.',
  intro_description: 'Explore reliable systems, components and expert support for homes, businesses and industry across Botswana.',
  about_title: 'Good water is the beginning of everything.',
  about_description: 'SANCTITY (Pty) Ltd trading as Puritech Botswana was established in 2007. We provide expertise in water treatment and purification systems from Gaborone International Commerce Park, representing Puritech for domestic products and Nimbus Water Technologies for larger projects.',
  contact_title: 'Let's talk about your water.',
  contact_description: 'Tell us what you need and our team will help you find the right solution.',
  contact_email: 'info@water.co.bw',
  contact_phone: '+267 318 7879',
  contact_phone_secondary: '+267 391 1399',
  contact_address: 'Plot 68, Unit 8, Gaborone International Commerce Park, Botswana'
};
