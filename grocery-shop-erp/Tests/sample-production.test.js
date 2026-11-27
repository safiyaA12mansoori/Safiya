'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-sample-prod-${process.pid}.json`);
process.env.NODE_ENV = 'production';
process.env.ALLOW_SAMPLE_LOGIN = 'true';
process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;
process.env.SUPER_ADMIN_NAME = 'Test Owner';
process.env.SUPER_ADMIN_EMAIL = 'owner@example.com';
process.env.SUPER_ADMIN_PASSWORD = 'Ownerpass1';

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSuperAdmin } = require('../Backend/Utils/seedSuperAdmin');
const { listen, request } = require('./helpers');

let server;
let base;

before(async () => {
  await fs.rm(dataFile, { force: true });
  await seedSuperAdmin();
  const started = await listen(createApp());
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

test('sample login is rejected in production even when the flag is on', async () => {
  const sample = await request(`${base}/api/auth/sample-login`, { method: 'POST', body: {} });
  assert.equal(sample.status, 404);

  const login = await request(`${base}/api/auth/login`, {
    method: 'POST',
    body: { email: 'owner@example.com', password: 'Ownerpass1' },
  });
  assert.equal(login.status, 200);
  assert.match(login.session, /HttpOnly/);
  assert.match(login.session, /Secure/);
});
