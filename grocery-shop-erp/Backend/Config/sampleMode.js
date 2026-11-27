'use strict';

const SAMPLE_JWT_SECRET = 'replace-with-a-long-random-string';
const SAMPLE_EMAIL = 'owner@example.com';

let enabled = false;

function hasRealSecret() {
  const secret = process.env.JWT_SECRET || '';
  return secret.length >= 24 && secret !== SAMPLE_JWT_SECRET;
}

function isLoopbackHost(hostHeader) {
  const raw = String(hostHeader || '').trim().toLowerCase();
  const host = raw.startsWith('[')
    ? raw.slice(1, raw.indexOf(']'))
    : raw.replace(/:\d+$/, '');
  return host === 'localhost' || host === '127.0.0.1' || host === '::1';
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
  isLoopbackHost,
};
