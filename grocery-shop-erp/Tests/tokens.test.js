'use strict';

process.env.JWT_SECRET = 'test-jwt-secret-phase1-grocery-shop-erp';
process.env.JWT_EXPIRES_IN = '1h';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { signToken, verifyToken } = require('../Backend/Utils/tokens');

test('JWT issue and verify returns the signed claims', () => {
  const token = signToken({ sub: 'user-1', role: 'Admin', tv: 2 });
  const payload = verifyToken(token);
  assert.equal(payload.sub, 'user-1');
  assert.equal(payload.role, 'Admin');
  assert.equal(payload.tv, 2);
});

test('JWT rejects a tampered token, a foreign secret, an expired token, and garbage', () => {
  const token = signToken({ sub: 'user-1', role: 'Cashier', tv: 0 });
  const parts = token.split('.');
  parts[2] = `${parts[2].slice(0, -2)}aa`;
  assert.throws(() => verifyToken(parts.join('.')));

  const foreign = jwt.sign({ sub: 'user-1', role: 'Cashier', tv: 0 }, 'a-different-secret-value-123456', {
    algorithm: 'HS256',
  });
  assert.throws(() => verifyToken(foreign));

  const expired = jwt.sign(
    { sub: 'user-1', role: 'Cashier', tv: 0, exp: Math.floor(Date.now() / 1000) - 30 },
    process.env.JWT_SECRET,
    { algorithm: 'HS256' }
  );
  assert.throws(() => verifyToken(expired));
  assert.throws(() => verifyToken('not-a-token'));
});
