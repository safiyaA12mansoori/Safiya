'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-sample-local-${process.pid}.json`);
process.env.NODE_ENV = 'development';
process.env.ALLOW_SAMPLE_LOGIN = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;
delete process.env.SUPER_ADMIN_NAME;
delete process.env.SUPER_ADMIN_EMAIL;
delete process.env.SUPER_ADMIN_PASSWORD;

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSampleShop } = require('../Backend/Utils/seedSuperAdmin');
const { listen, request } = require('./helpers');

let server;
let base;

before(async () => {
  await fs.rm(dataFile, { force: true });
  const app = createApp();
  await seedSampleShop();
  const started = await listen(app);
  server = started.server;
  base = started.base;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await fs.rm(dataFile, { force: true });
});

test('local sample sign-in works only on a loopback host when opted in', async () => {
  const health = await request(`${base}/api/health`);
  assert.deepEqual(health.data, { ok: true });

  const entered = await request(`${base}/api/auth/sample-login`, {
    method: 'POST',
    body: {},
  });
  assert.equal(entered.status, 200);
  assert.equal(entered.data.user.role, 'Super Admin');
  assert.equal(entered.data.user.email, 'owner@example.com');
  assert.equal(entered.data.token, undefined);
  assert.match(entered.session, /HttpOnly/);
  assert.doesNotMatch(entered.session, /Secure/);

  const remote = await request(`${base}/api/auth/sample-login`, {
    method: 'POST',
    body: {},
    headers: { host: 'shop.example' },
  });
  assert.equal(remote.status, 404);
});
