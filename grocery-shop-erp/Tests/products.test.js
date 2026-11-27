'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-product-users-${process.pid}.json`);
const productsFile = path.join(os.tmpdir(), `grocery-erp-products-${process.pid}.json`);
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;
process.env.PRODUCTS_FILE = productsFile;
process.env.SUPER_ADMIN_NAME = 'Test Owner';
process.env.SUPER_ADMIN_EMAIL = 'owner@example.com';
process.env.SUPER_ADMIN_PASSWORD = 'Ownerpass1';

const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSuperAdmin } = require('../Backend/Utils/seedSuperAdmin');
const { ensureProductCatalog } = require('../Backend/Services/productService');
const { listen, request } = require('./helpers');

describe('product catalog', { concurrency: false }, () => {
let server;
let base;
let ownerCookie;

before(async () => {
  await fs.rm(dataFile, { force: true });
  await fs.rm(productsFile, { force: true });
  await seedSuperAdmin();
  const seeded = await ensureProductCatalog();
  assert.equal(seeded.created, 20);
  const started = await listen(createApp());
  server = started.server;
  base = started.base;
  const login = await request(`${base}/api/auth/login`, {
    method: 'POST',
    body: { email: 'owner@example.com', password: 'Ownerpass1' },
  });
  assert.equal(login.status, 200);
  ownerCookie = login.cookieHeader;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await fs.rm(dataFile, { force: true });
  await fs.rm(productsFile, { force: true });
});

test('the shop opens with 20 catalog products', async () => {
  const locked = await request(`${base}/api/products`);
  assert.equal(locked.status, 401);

  const listed = await request(`${base}/api/products`, {
    headers: { cookie: ownerCookie },
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.products.length, 20);
  const names = listed.data.products.map((product) => product.name);
  assert.equal(names.includes('Aashirvaad Whole Wheat Atta'), true);
  assert.equal(names.includes('Kissan Mixed Fruit Jam'), true);
  for (const product of listed.data.products) {
    assert.equal(Number.isInteger(product.pricePaise), true);
    assert.equal(product.pricePaise > 0, true);
    assert.equal(product.passwordHash, undefined);
  }
  const atta = listed.data.products.find((product) => product.sku === 'GS-001');
  assert.equal(atta.pricePaise, 28500);
  assert.equal(atta.category, 'Staples');
});

test('a cashier can read products and cannot change them', async () => {
  const created = await request(`${base}/api/users`, {
    method: 'POST',
    headers: { cookie: ownerCookie },
    body: {
      name: 'Counter Cashier',
      email: 'cashier@example.com',
      role: 'Cashier',
      password: 'Cashierpass1',
    },
  });
  assert.equal(created.status, 201);
  const cashier = await request(`${base}/api/auth/login`, {
    method: 'POST',
    body: { email: 'cashier@example.com', password: 'Cashierpass1' },
  });
  assert.equal(cashier.status, 200);
  const listed = await request(`${base}/api/products`, {
    headers: { cookie: cashier.cookieHeader },
  });
  assert.equal(listed.status, 200);
  assert.equal(listed.data.products.length, 20);
  const denied = await request(`${base}/api/products`, {
    method: 'POST',
    headers: { cookie: cashier.cookieHeader },
    body: {
      name: 'Extra Soap',
      category: 'Household',
      packSize: '1 piece',
      unit: 'piece',
      priceRupees: 20,
    },
  });
  assert.equal(denied.status, 403);
});

test('inventory staff can add a product', async () => {
  const created = await request(`${base}/api/users`, {
    method: 'POST',
    headers: { cookie: ownerCookie },
    body: {
      name: 'Stock Keeper',
      email: 'stock@example.com',
      role: 'Inventory Staff',
      password: 'Stockpass1',
    },
  });
  assert.equal(created.status, 201);
  const staff = await request(`${base}/api/auth/login`, {
    method: 'POST',
    body: { email: 'stock@example.com', password: 'Stockpass1' },
  });
  const added = await request(`${base}/api/products`, {
    method: 'POST',
    headers: { cookie: staff.cookieHeader },
    body: {
      name: 'Poha',
      category: 'Staples',
      packSize: '500 g',
      unit: 'g',
      priceRupees: '42.50',
    },
  });
  assert.equal(added.status, 201);
  assert.equal(added.data.product.pricePaise, 4250);
  assert.equal(added.data.product.sku, 'GS-021');
});
});
