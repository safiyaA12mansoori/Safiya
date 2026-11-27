'use strict';

const crypto = require('crypto');

const SAMPLE_JWT_SECRET = 'replace-with-a-long-random-string';
const SAMPLE_PASSWORD = 'replace-with-a-strong-password';
const SAMPLE_EMAIL = 'owner@example.com';

let enabled = false;

function hasRealSecret() {
  const secret = process.env.JWT_SECRET || '';
  return secret.length >= 24 && secret !== SAMPLE_JWT_SECRET;
}

function hasRealAdmin() {
  const password = process.env.SUPER_ADMIN_PASSWORD || '';
  const email = process.env.SUPER_ADMIN_EMAIL || '';
  return Boolean(email && password && password !== SAMPLE_PASSWORD);
}

function enableSampleMode() {
  if (enabled) {
    return true;
  }
  if (hasRealSecret() || hasRealAdmin()) {
    return false;
  }
  process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
  enabled = true;
  return true;
}

function isSampleMode() {
  return enabled;
}

module.exports = {
  SAMPLE_EMAIL,
  enableSampleMode,
  isSampleMode,
};
