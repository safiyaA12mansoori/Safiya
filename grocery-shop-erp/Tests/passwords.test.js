'use strict';

process.env.BCRYPT_ROUNDS = '4';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { hashPassword, verifyPassword } = require('../Backend/Utils/passwords');

test('password hashing stores a bcrypt hash, not the password', async () => {
  const plain = 'Ownerpass1';
  const hash = await hashPassword(plain);
  const again = await hashPassword(plain);

  assert.notEqual(hash, plain);
  assert.match(hash, /^\$2[aby]\$/);
  assert.notEqual(hash, again);
  assert.equal(await verifyPassword(plain, hash), true);
  assert.equal(await verifyPassword('Ownerpass2', hash), false);
});
