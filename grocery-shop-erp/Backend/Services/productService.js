'use strict';

const { CATEGORIES, UNITS, PRODUCT_CATALOG } = require('../Data/productCatalog');
const { createProductStore, toPublicProduct } = require('./productStore');
const { httpError } = require('../Utils/httpError');

function cleanText(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ');
}

function pricePaiseFromBody(body) {
  if (Number.isInteger(body.pricePaise)) {
    return body.pricePaise;
  }
  if (body.priceRupees === undefined || body.priceRupees === null || body.priceRupees === '') {
    return null;
  }
  const rupees = typeof body.priceRupees === 'number' ? body.priceRupees : Number(String(body.priceRupees).trim());
  if (!Number.isFinite(rupees)) {
    return null;
  }
  return Math.round(rupees * 100);
}

function validateProduct(body, { partial }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Request body must be a JSON object.');
  }
  const errors = [];
  const next = {};
  if (!partial || body.name !== undefined) {
    next.name = cleanText(body.name);
    if (next.name.length < 2 || next.name.length > 80) {
      errors.push('Name must be 2 to 80 characters.');
    }
  }
  if (!partial || body.category !== undefined) {
    next.category = cleanText(body.category);
    if (!CATEGORIES.includes(next.category)) {
      errors.push('Choose a product category.');
    }
  }
  if (!partial || body.packSize !== undefined) {
    next.packSize = cleanText(body.packSize);
    if (next.packSize.length < 1 || next.packSize.length > 40) {
      errors.push('Pack size must be 1 to 40 characters.');
    }
  }
  if (!partial || body.unit !== undefined) {
    next.unit = cleanText(body.unit);
    if (!UNITS.includes(next.unit)) {
      errors.push('Choose a unit.');
    }
  }
  if (!partial || body.sku !== undefined) {
    const sku = cleanText(body.sku).toUpperCase();
    if (sku && !/^[A-Z0-9-]{2,20}$/.test(sku)) {
      errors.push('SKU must be 2 to 20 letters, numbers, or hyphens.');
    }
    if (sku) {
      next.sku = sku;
    }
  }
  if (!partial || body.priceRupees !== undefined || body.pricePaise !== undefined) {
    const pricePaise = pricePaiseFromBody(body);
    if (!Number.isInteger(pricePaise) || pricePaise < 1 || pricePaise > 10000000) {
      errors.push('Selling price must be from ₹0.01 to ₹1,00,000.00.');
    } else {
      next.pricePaise = pricePaise;
    }
  }
  if (body.active !== undefined) {
    if (typeof body.active !== 'boolean') {
      errors.push('Active must be true or false.');
    } else {
      next.active = body.active;
    }
  }
  if (errors.length) {
    throw httpError(400, errors.join(' '));
  }
  return next;
}

async function listProducts() {
  const products = await createProductStore().list();
  products.sort((a, b) => a.sku.localeCompare(b.sku));
  return products.map(toPublicProduct);
}

async function ensureProductCatalog() {
  const store = createProductStore();
  const existing = await store.list();
  if (existing.length > 0) {
    return { created: 0, total: existing.length };
  }
  for (const item of PRODUCT_CATALOG) {
    await store.create(item);
  }
  return { created: PRODUCT_CATALOG.length, total: PRODUCT_CATALOG.length };
}

async function createProduct(body) {
  const input = validateProduct(body, { partial: false });
  const store = createProductStore();
  if (!input.sku) {
    const products = await store.list();
    const used = new Set(products.map((product) => product.sku));
    let number = products.length + 1;
    let sku = `GS-${String(number).padStart(3, '0')}`;
    while (used.has(sku)) {
      number += 1;
      sku = `GS-${String(number).padStart(3, '0')}`;
    }
    input.sku = sku;
  }
  const duplicate = await store.withTransaction((tx) => tx.findBySku(input.sku));
  if (duplicate) {
    throw httpError(409, 'That SKU is already in the shop.');
  }
  const product = await store.create(input);
  return toPublicProduct(product);
}

async function updateProduct(id, body) {
  if (!/^[0-9a-f-]{36}$/i.test(String(id || ''))) {
    throw httpError(404, 'Product not found');
  }
  const patch = validateProduct(body, { partial: true });
  const store = createProductStore();
  if (patch.sku) {
    const duplicate = await store.withTransaction((tx) => tx.findBySku(patch.sku));
    if (duplicate && duplicate.id !== id) {
      throw httpError(409, 'That SKU is already in the shop.');
    }
  }
  const product = await store.update(id, patch);
  if (!product) {
    throw httpError(404, 'Product not found');
  }
  return toPublicProduct(product);
}

module.exports = {
  listProducts,
  ensureProductCatalog,
  createProduct,
  updateProduct,
};
