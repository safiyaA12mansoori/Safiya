'use strict';

const crypto = require('crypto');
const { getConfig } = require('../Config');
const { SAMPLE_EMAIL } = require('../Config/sampleMode');
const { createUserStore, toPublicUser } = require('../Services/userStore');
const { hashPassword } = require('./passwords');
const { validateCreateUser, SAMPLE_PASSWORD } = require('./validate');

async function seedSuperAdmin() {
  getConfig();
  const name = process.env.SUPER_ADMIN_NAME || '';
  const email = process.env.SUPER_ADMIN_EMAIL || '';
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  if (!process.env.SUPER_ADMIN_PASSWORD || password === SAMPLE_PASSWORD) {
    throw new Error(
      'Set SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL, and SUPER_ADMIN_PASSWORD in the environment. Do not use the sample password from .env.example.'
    );
  }
  const input = validateCreateUser({
    name,
    email,
    password,
    role: 'Super Admin',
  });
  const store = createUserStore();
  const existing = await store.findByEmail(input.email);
  if (existing) {
    return {
      created: false,
      user: toPublicUser(existing),
    };
  }
  const passwordHash = await hashPassword(input.password);
  const user = await store.create({
    name: input.name,
    email: input.email,
    role: 'Super Admin',
    passwordHash,
    active: true,
  });
  return {
    created: true,
    user: toPublicUser(user),
  };
}

if (require.main === module) {
  seedSuperAdmin()
    .then((result) => {
      if (result.created) {
        console.log(`Super Admin created for ${result.user.email}`);
      } else {
        console.log(`A user with ${result.user.email} already exists. The password was not changed.`);
      }
      console.log('Phase 1 stores this account in a local JSON file, not in a database.');
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

async function seedSampleShop() {
  const store = createUserStore();
  const users = await store.list();
  if (users.length > 0) {
    return { created: false };
  }
  const passwordHash = await hashPassword(crypto.randomBytes(24).toString('hex'));
  await store.create({
    name: 'Shop Owner',
    email: SAMPLE_EMAIL,
    role: 'Super Admin',
    passwordHash,
    active: true,
  });
  return { created: true };
}

module.exports = { seedSuperAdmin, seedSampleShop };
