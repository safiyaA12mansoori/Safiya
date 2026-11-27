'use strict';

const CATEGORIES = Object.freeze([
  'Staples',
  'Pulses',
  'Oil',
  'Dairy',
  'Beverages',
  'Snacks',
  'Spices',
  'Household',
  'Spreads',
]);

const UNITS = Object.freeze(['kg', 'g', 'L', 'ml', 'pack', 'piece']);

const PRODUCT_CATALOG = Object.freeze([
  { sku: 'GS-001', name: 'Aashirvaad Whole Wheat Atta', category: 'Staples', packSize: '5 kg', unit: 'kg', pricePaise: 28500 },
  { sku: 'GS-002', name: 'India Gate Basmati Rice', category: 'Staples', packSize: '5 kg', unit: 'kg', pricePaise: 62000 },
  { sku: 'GS-003', name: 'Tata Salt', category: 'Staples', packSize: '1 kg', unit: 'kg', pricePaise: 2800 },
  { sku: 'GS-004', name: 'Sugar', category: 'Staples', packSize: '1 kg', unit: 'kg', pricePaise: 4800 },
  { sku: 'GS-005', name: 'Toor Dal', category: 'Pulses', packSize: '1 kg', unit: 'kg', pricePaise: 16000 },
  { sku: 'GS-006', name: 'Moong Dal', category: 'Pulses', packSize: '1 kg', unit: 'kg', pricePaise: 14500 },
  { sku: 'GS-007', name: 'Fortune Sunflower Oil', category: 'Oil', packSize: '1 L', unit: 'L', pricePaise: 16500 },
  { sku: 'GS-008', name: 'Amul Gold Milk', category: 'Dairy', packSize: '1 L', unit: 'L', pricePaise: 6800 },
  { sku: 'GS-009', name: 'Amul Butter', category: 'Dairy', packSize: '500 g', unit: 'g', pricePaise: 28500 },
  { sku: 'GS-010', name: 'Mother Dairy Curd', category: 'Dairy', packSize: '400 g', unit: 'g', pricePaise: 4000 },
  { sku: 'GS-011', name: 'Tata Tea Gold', category: 'Beverages', packSize: '250 g', unit: 'g', pricePaise: 15500 },
  { sku: 'GS-012', name: 'Bru Instant Coffee', category: 'Beverages', packSize: '50 g', unit: 'g', pricePaise: 17500 },
  { sku: 'GS-013', name: 'Parle-G Biscuits', category: 'Snacks', packSize: '800 g', unit: 'g', pricePaise: 9000 },
  { sku: 'GS-014', name: 'Maggi 2-Minute Noodles', category: 'Snacks', packSize: '12 pack', unit: 'pack', pricePaise: 16800 },
  { sku: 'GS-015', name: 'Everest Turmeric Powder', category: 'Spices', packSize: '200 g', unit: 'g', pricePaise: 6800 },
  { sku: 'GS-016', name: 'MDH Garam Masala', category: 'Spices', packSize: '100 g', unit: 'g', pricePaise: 8500 },
  { sku: 'GS-017', name: 'Surf Excel Detergent', category: 'Household', packSize: '1 kg', unit: 'kg', pricePaise: 14500 },
  { sku: 'GS-018', name: 'Lifebuoy Soap', category: 'Household', packSize: '4 pack', unit: 'pack', pricePaise: 12000 },
  { sku: 'GS-019', name: 'Colgate Toothpaste', category: 'Household', packSize: '200 g', unit: 'g', pricePaise: 11000 },
  { sku: 'GS-020', name: 'Kissan Mixed Fruit Jam', category: 'Spreads', packSize: '500 g', unit: 'g', pricePaise: 17500 },
]);

module.exports = {
  CATEGORIES,
  UNITS,
  PRODUCT_CATALOG,
};
