'use strict';

const jwt = require('jsonwebtoken');
const { assertJwtSecret, getConfig } = require('../Config');

function signToken(claims, options = {}) {
  const config = getConfig();
  assertJwtSecret(config.jwtSecret);
  return jwt.sign(
    {
      sub: claims.sub,
      role: claims.role,
      tv: claims.tv,
    },
    config.jwtSecret,
    {
      algorithm: 'HS256',
      expiresIn: options.expiresIn || config.jwtExpiresIn,
    }
  );
}

function verifyToken(token) {
  const config = getConfig();
  assertJwtSecret(config.jwtSecret);
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

module.exports = {
  signToken,
  verifyToken,
};
