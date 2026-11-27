'use strict';

const SAMPLE_JWT_SECRET = 'replace-with-a-long-random-string';
const SAMPLE_EMAIL = 'owner@example.com';

let enabled = false;

function hasRealSecret() {
  const secret = process.env.JWT_SECRET || '';
  return secret.length >= 24 && secret !== SAMPLE_JWT_SECRET;
}

function isLoopbackSocket(remoteAddress) {
  const address = String(remoteAddress || '').trim().toLowerCase().replace(/^::ffff:/, '');
  return address === '127.0.0.1' || address === '::1';
}

function enableSampleMode() {
  enabled = false;
  if (process.env.NODE_ENV === 'production') {
    return false;
  }
  if (process.env.ALLOW_SAMPLE_LOGIN !== 'true') {
    return false;
  }
  if (!hasRealSecret()) {
    return false;
  }
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
  isLoopbackSocket,
};
