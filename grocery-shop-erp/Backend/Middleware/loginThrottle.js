'use strict';

const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

function bucketKey(req, email) {
  return `${req.ip || 'unknown'}|${email}`;
}

function prune(entry) {
  return entry && Date.now() - entry.start < WINDOW_MS;
}

function assertLoginAllowed(req, email) {
  const entry = attempts.get(bucketKey(req, email));
  if (prune(entry) && entry.count >= MAX_FAILURES) {
    const error = new Error('Too many sign-in attempts. Wait a few minutes and try again.');
    error.status = 429;
    throw error;
  }
}

function recordLoginFailure(req, email) {
  const key = bucketKey(req, email);
  const current = attempts.get(key);
  if (!prune(current)) {
    attempts.set(key, { count: 1, start: Date.now() });
    return;
  }
  current.count += 1;
}

function clearLoginFailures(req, email) {
  attempts.delete(bucketKey(req, email));
}

module.exports = {
  assertLoginAllowed,
  recordLoginFailure,
  clearLoginFailures,
};
