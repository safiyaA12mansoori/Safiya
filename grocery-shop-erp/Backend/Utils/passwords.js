'use strict';

const bcrypt = require('bcrypt');
const { getConfig } = require('../Config');

async function hashPassword(plain) {
  const { bcryptRounds } = getConfig();
  return bcrypt.hash(plain, bcryptRounds);
}

async function verifyPassword(plain, passwordHash) {
  return bcrypt.compare(plain, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};
