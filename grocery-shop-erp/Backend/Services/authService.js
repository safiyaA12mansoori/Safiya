'use strict';

const { createUserStore, toPublicUser } = require('./userStore');
const { hashPassword, verifyPassword } = require('../Utils/passwords');
const { signToken } = require('../Utils/tokens');
const { validateLogin, validateChangePassword } = require('../Utils/validate');
const { httpError } = require('../Utils/httpError');
const { isSampleMode, isLoopbackHost, SAMPLE_EMAIL } = require('../Config/sampleMode');

let dummyHashPromise = null;

function dummyHash() {
  if (!dummyHashPromise) {
    dummyHashPromise = hashPassword('not-a-real-password');
  }
  return dummyHashPromise;
}

function issueToken(user) {
  return signToken({
    sub: user.id,
    role: user.role,
    tv: user.tokenVersion,
  });
}

async function login(body) {
  const { email, password } = validateLogin(body);
  const store = createUserStore();
  const user = await store.findByEmail(email);
  const passwordHash = user ? user.passwordHash : await dummyHash();
  const matches = await verifyPassword(password, passwordHash);
  if (!user || !matches) {
    throw httpError(401, 'Invalid email or password');
  }
  if (!user.active) {
    throw httpError(403, 'This account is inactive. Ask a Super Admin or Admin to activate it.');
  }
  return {
    token: issueToken(user),
    user: toPublicUser(user),
  };
}

async function sampleLogin(req) {
  const host = req && req.headers ? req.headers.host : '';
  if (!isSampleMode() || !isLoopbackHost(host)) {
    throw httpError(404, 'Not found');
  }
  const store = createUserStore();
  const user = await store.findByEmail(SAMPLE_EMAIL);
  if (!user || !user.active || user.role !== 'Super Admin') {
    throw httpError(503, 'The sample shop is not ready');
  }
  return {
    token: issueToken(user),
    user: toPublicUser(user),
  };
}

async function endSession(userId) {
  const store = createUserStore();
  await store.withTransaction((tx) => {
    const fresh = tx.findById(userId);
    if (!fresh) {
      return null;
    }
    return tx.update(userId, { tokenVersion: fresh.tokenVersion + 1 });
  });
}

async function changePassword(userId, body) {
  const { currentPassword, newPassword } = validateChangePassword(body);
  const store = createUserStore();
  const user = await store.findById(userId);
  if (!user || !user.active) {
    throw httpError(401, 'Sign in required');
  }
  const matches = await verifyPassword(currentPassword, user.passwordHash);
  if (!matches) {
    throw httpError(400, 'Current password is incorrect');
  }
  const passwordHash = await hashPassword(newPassword);
  const updated = await store.withTransaction(async (tx) => {
    const fresh = tx.findById(userId);
    if (!fresh) {
      throw httpError(401, 'Sign in required');
    }
    return tx.update(userId, {
      passwordHash,
      tokenVersion: fresh.tokenVersion + 1,
    });
  });
  return {
    token: issueToken(updated),
    user: toPublicUser(updated),
  };
}

module.exports = {
  login,
  sampleLogin,
  changePassword,
  endSession,
  issueToken,
};
