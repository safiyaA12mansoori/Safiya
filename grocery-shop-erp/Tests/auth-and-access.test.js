'use strict';

const fs = require('fs/promises');
const os = require('os');
const path = require('path');

const dataFile = path.join(os.tmpdir(), `grocery-erp-users-${process.pid}.json`);
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '2h';
process.env.BCRYPT_ROUNDS = '4';
process.env.DATA_FILE = dataFile;
process.env.SUPER_ADMIN_NAME = 'Test Owner';
process.env.SUPER_ADMIN_EMAIL = 'owner@example.com';
process.env.SUPER_ADMIN_PASSWORD = 'Ownerpass1';

const { after, before, describe, test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../Backend/Server');
const { seedSuperAdmin } = require('../Backend/Utils/seedSuperAdmin');
const { signToken } = require('../Backend/Utils/tokens');
const { listen, request } = require('./helpers');

test('phase 1 does not depend on a database driver', () => {
  const pkg = require('../package.json');
  const names = Object.keys(pkg.dependencies || {});
  assert.equal(names.includes('pg'), false);
  assert.equal(names.includes('postgres'), false);
  assert.equal(names.includes('pg-promise'), false);
});

describe('phase 1 auth and access', { concurrency: false }, () => {
  let server;
  let base;
  let ownerCookie;

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

  test('login failure and login success', async () => {
    const unknown = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'missing@example.com', password: 'Ownerpass1' },
    });
    assert.equal(unknown.status, 401);
    assert.equal(unknown.data.error, 'Invalid email or password');
    assert.equal(unknown.cookieHeader, '');

    const wrong = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'owner@example.com', password: 'Wrongpass1' },
    });
    assert.equal(wrong.status, 401);
    assert.equal(wrong.data.error, 'Invalid email or password');

    const success = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'owner@example.com', password: 'Ownerpass1' },
    });
    assert.equal(success.status, 200);
    assert.equal(success.data.user.email, 'owner@example.com');
    assert.equal(success.data.user.role, 'Super Admin');
    assert.equal(success.data.token, undefined);
    assert.equal(success.data.user.passwordHash, undefined);
    assert.match(success.session, /HttpOnly/);
    assert.match(success.session, /SameSite=Lax/);
    assert.doesNotMatch(success.session, /Secure/);
    ownerCookie = success.cookieHeader;
  });

  test('protected route without a token returns 401', async () => {
    const me = await request(`${base}/api/auth/me`);
    assert.equal(me.status, 401);
    const users = await request(`${base}/api/users`);
    assert.equal(users.status, 401);
  });

  test('a valid session cookie and a valid bearer token are accepted', async () => {
    const me = await request(`${base}/api/auth/me`, {
      headers: { cookie: ownerCookie },
    });
    assert.equal(me.status, 200);
    assert.equal(me.data.user.role, 'Super Admin');
    assert.ok(me.data.permissions.includes('users.manage'));

    const token = signToken({ sub: me.data.user.id, role: 'Cashier', tv: 0 });
    const asBearer = await request(`${base}/api/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(asBearer.status, 200);
    assert.equal(asBearer.data.user.role, 'Super Admin');
  });

  test('a bad bearer token is rejected', async () => {
    const bad = await request(`${base}/api/auth/me`, {
      headers: { authorization: 'Bearer not-a-token' },
    });
    assert.equal(bad.status, 401);

    const missingUser = signToken({
      sub: '00000000-0000-4000-8000-000000000000',
      role: 'Super Admin',
      tv: 0,
    });
    const unknown = await request(`${base}/api/auth/me`, {
      headers: { authorization: `Bearer ${missingUser}` },
    });
    assert.equal(unknown.status, 401);
  });

  test('super admin can manage users and a cashier cannot', async () => {
    const listed = await request(`${base}/api/users`, {
      headers: { cookie: ownerCookie },
    });
    assert.equal(listed.status, 200);
    assert.equal(JSON.stringify(listed.data).includes('passwordHash'), false);
    assert.ok(listed.data.users.some((user) => user.email === 'owner@example.com'));

    const invalid = await request(`${base}/api/users`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: { name: 'A', email: 'not-an-email', role: 'Cashier', password: 'short' },
    });
    assert.equal(invalid.status, 400);

    const created = await request(`${base}/api/users`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: {
        name: 'Ravi Cashier',
        email: 'cashier@example.com',
        role: 'Cashier',
        password: 'Cashierpass1',
      },
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.user.role, 'Cashier');
    assert.equal(created.data.user.passwordHash, undefined);

    const cashierLogin = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'cashier@example.com', password: 'Cashierpass1' },
    });
    assert.equal(cashierLogin.status, 200);
    const cashierCookie = cashierLogin.cookieHeader;

    const cashierList = await request(`${base}/api/users`, {
      headers: { cookie: cashierCookie },
    });
    assert.equal(cashierList.status, 403);

    const cashierCreate = await request(`${base}/api/users`, {
      method: 'POST',
      headers: { cookie: cashierCookie },
      body: {
        name: 'Extra Person',
        email: 'extra@example.com',
        role: 'Manager',
        password: 'Managerpass1',
      },
    });
    assert.equal(cashierCreate.status, 403);

    const cashierMe = await request(`${base}/api/auth/me`, {
      headers: { cookie: cashierCookie },
    });
    assert.equal(cashierMe.data.permissions.includes('users.manage'), false);
    assert.equal(cashierMe.data.permissions.includes('dashboard.view'), true);
  });

  test('change password replaces the session and the old password stops working', async () => {
    const changed = await request(`${base}/api/auth/change-password`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
      body: { currentPassword: 'Ownerpass1', newPassword: 'Ownerpass2' },
    });
    assert.equal(changed.status, 200);
    assert.equal(changed.data.ok, true);
    assert.match(changed.session, /HttpOnly/);

    const oldSession = await request(`${base}/api/auth/me`, {
      headers: { cookie: ownerCookie },
    });
    assert.equal(oldSession.status, 401);

    const oldPassword = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'owner@example.com', password: 'Ownerpass1' },
    });
    assert.equal(oldPassword.status, 401);

    const nextLogin = await request(`${base}/api/auth/login`, {
      method: 'POST',
      body: { email: 'owner@example.com', password: 'Ownerpass2' },
    });
    assert.equal(nextLogin.status, 200);
    ownerCookie = nextLogin.cookieHeader;
  });

  test('logout ends the session token', async () => {
    const loggedOut = await request(`${base}/api/auth/logout`, {
      method: 'POST',
      headers: { cookie: ownerCookie },
    });
    assert.equal(loggedOut.status, 200);
    assert.match(loggedOut.session, /Max-Age=0/);

    const again = await request(`${base}/api/auth/me`, {
      headers: { cookie: ownerCookie },
    });
    assert.equal(again.status, 401);
  });

  test('health and pages do not pretend the database is connected', async () => {
    const health = await request(`${base}/api/health`);
    assert.equal(health.status, 200);
    assert.equal(health.data.database, 'not-connected');
    assert.equal(health.data.store, 'file');

    const dashboard = await request(`${base}/pages/dashboard.html`, { raw: true });
    assert.equal(dashboard.status, 200);
    assert.match(dashboard.text, /Values load from the database in a later phase/);
    assert.doesNotMatch(dashboard.text, /₹\s*[1-9]/);

    const home = await request(`${base}/`, { raw: true });
    assert.match(home.text, /Available in a later phase/);
    const login = await request(`${base}/login.html`, { raw: true });
    assert.match(login.text, /Sign in/);
  });
});
