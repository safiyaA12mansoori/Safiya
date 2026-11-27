'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-sample-${process.pid}.json`);
delete process.env.JWT_SECRET;
delete process.env.SUPER_ADMIN_NAME;
delete process.env.SUPER_ADMIN_EMAIL;
delete process.env.SUPER_ADMIN_PASSWORD;
process.env.NODE_ENV = 'test';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSampleShop } = require('../Backend/Utils/seedSuperAdmin');
const { listen, request } = require('./helpers');

let server;

before(async () => {
  await fs.rm(dataFile, { force: true });
  const app = createApp();
  await seedSampleShop();
  const started = await listen(app);
  server = started.server;
  global.baseUrl = started.base;
});

after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await fs.rm(dataFile, { force: true });
});

test('sample shop signs in without configured secrets', async () => {
  const health = await request(`${global.baseUrl}/api/health`);
  assert.equal(health.status, 200);
  assert.equal(health.data.sample, true);
  assert.equal(health.data.database, 'not-connected');

  const entered = await request(`${global.baseUrl}/api/auth/sample-login`, {
    method: 'POST',
    body: {},
  });
  assert.equal(entered.status, 200);
  assert.equal(entered.data.sample, true);
  assert.equal(entered.data.user.role, 'Super Admin');
  assert.equal(entered.data.user.passwordHash, undefined);
  assert.equal(entered.data.token, undefined);
  assert.match(entered.session, /HttpOnly/);

  const me = await request(`${global.baseUrl}/api/auth/me`, {
    headers: { cookie: entered.cookieHeader },
  });
  assert.equal(me.status, 200);
  assert.equal(me.data.user.email, 'owner@example.com');
});
