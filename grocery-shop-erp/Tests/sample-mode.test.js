'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-sample-off-${process.pid}.json`);
delete process.env.ALLOW_SAMPLE_LOGIN;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;
delete process.env.SUPER_ADMIN_NAME;
delete process.env.SUPER_ADMIN_EMAIL;
delete process.env.SUPER_ADMIN_PASSWORD;

const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSuperAdmin } = require('../Backend/Utils/seedSuperAdmin');
const { listen, request } = require('./helpers');

describe('sample sign-in stays off by default', { concurrency: false }, () => {
  let server;
  let base;

  before(async () => {
    await fs.rm(dataFile, { force: true });
    process.env.SUPER_ADMIN_NAME = 'Test Owner';
    process.env.SUPER_ADMIN_EMAIL = 'owner@example.com';
    process.env.SUPER_ADMIN_PASSWORD = 'Ownerpass1';
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

  test('sample login is rejected when the opt-in flag is off', async () => {
    const health = await request(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(health.data, { ok: true });
    const sample = await request(`${base}/api/auth/sample-login`, { method: 'POST', body: {} });
    assert.equal(sample.status, 404);
  });

  test('a missing JWT secret does not open sample sign-in', () => {
    const previous = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    delete process.env.ALLOW_SAMPLE_LOGIN;
    assert.throws(() => createApp(), /JWT_SECRET/);
    process.env.JWT_SECRET = previous;
  });

  test('the sample secret from the example env file is rejected', () => {
    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'replace-with-a-long-random-string';
    assert.throws(() => createApp(), /JWT_SECRET/);
    process.env.JWT_SECRET = previous;
  });
});
