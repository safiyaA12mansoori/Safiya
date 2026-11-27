'use strict';

const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const SAMPLE_JWT_SECRET = 'replace-with-a-long-random-string';

let envLoaded = false;

function loadEnvFile() {
  if (envLoaded) {
    return;
  }
  envLoaded = true;
  const envPath = path.join(projectRoot, '.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  const text = fs.readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    if (!/^[A-Z0-9_]+$/.test(key)) {
      continue;
    }
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function expiresToMs(value) {
  const match = String(value || '').trim().match(/^(\d+)([smhd])$/);
  if (!match) {
    return 8 * 60 * 60 * 1000;
  }
  const amount = Number(match[1]);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[match[2]];
  return amount * unit;
}

function getConfig() {
  loadEnvFile();
  const dataFile = process.env.DATA_FILE
    ? path.resolve(projectRoot, process.env.DATA_FILE)
    : path.join(projectRoot, 'Backend', 'data', 'users.json');
  const rounds = Number(process.env.BCRYPT_ROUNDS || 12);
  return {
    projectRoot,
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    jwtMaxAgeMs: expiresToMs(process.env.JWT_EXPIRES_IN || '8h'),
    dataFile,
    bcryptRounds: Number.isInteger(rounds) && rounds >= 4 && rounds <= 15 ? rounds : 12,
    cookieName: 'gs_session',
    nodeEnv: process.env.NODE_ENV || 'development',
    timeZone: 'Asia/Kolkata',
    currency: 'INR',
  };
}

function assertJwtSecret(secret) {
  if (typeof secret !== 'string' || secret.length < 24 || secret === SAMPLE_JWT_SECRET) {
    throw new Error(
      'Set JWT_SECRET to a random string of at least 24 characters. Do not use the sample from .env.example.'
    );
  }
}

module.exports = {
  getConfig,
  assertJwtSecret,
  projectRoot,
};
