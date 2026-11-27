'use strict';

const { createUserStore, toPublicUser } = require('../Services/userStore');
const { verifyToken } = require('../Utils/tokens');
const { readCookies } = require('../Utils/cookies');
const { getConfig } = require('../Config');
const { httpError } = require('../Utils/httpError');

function readBearer(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(\S+)\s*$/i);
  return match ? match[1] : '';
}

async function authenticate(req, res, next) {
  try {
    const config = getConfig();
    const bearer = readBearer(req);
    const cookies = readCookies(req);
    const token = bearer || cookies[config.cookieName] || '';
    if (!token) {
      throw httpError(401, 'Sign in required');
    }
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw httpError(401, 'Sign in required');
    }
    if (!payload || typeof payload.sub !== 'string' || typeof payload.tv !== 'number') {
      throw httpError(401, 'Sign in required');
    }
    const store = createUserStore();
    const user = await store.findById(payload.sub);
    if (!user || !user.active || user.tokenVersion !== payload.tv) {
      throw httpError(401, 'Sign in required');
    }
    req.user = toPublicUser(user);
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate };
