'use strict';

const { ROLES } = require('../Config/roles');
const { httpError } = require('./httpError');

const SAMPLE_PASSWORD = 'replace-with-a-strong-password';

function cleanName(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().replace(/\s+/g, ' ');
}

function cleanEmail(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

function nameError(name) {
  if (name.length < 2 || name.length > 80) {
    return 'Name must be 2 to 80 characters.';
  }
  if (!/^[\p{L}][\p{L}\p{M}\s.'-]{1,79}$/u.test(name)) {
    return 'Name can use letters, spaces, apostrophes, dots, and hyphens.';
  }
  return '';
}

function emailError(email) {
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Enter a valid email address.';
  }
  return '';
}

function passwordError(password, label) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 72) {
    return `${label} must be 8 to 72 characters.`;
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return `${label} must be 8 to 72 bytes.`;
  }
  if (!/\p{L}/u.test(password) || !/[0-9]/.test(password)) {
    return `${label} must include a letter and a number.`;
  }
  if (password === SAMPLE_PASSWORD) {
    return `${label} is still the sample from .env.example. Choose a different one.`;
  }
  return '';
}

function roleError(role) {
  if (!ROLES.includes(role)) {
    return 'Choose a valid role.';
  }
  return '';
}

function fail(errors) {
  throw httpError(400, errors.join(' '));
}

function requireBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw httpError(400, 'Request body must be a JSON object.');
  }
}

function validateLogin(body) {
  requireBody(body);
  const email = cleanEmail(body.email);
  const errors = [];
  const emailMessage = emailError(email);
  if (emailMessage) {
    errors.push(emailMessage);
  }
  if (typeof body.password !== 'string' || body.password.length === 0) {
    errors.push('Password is required.');
  }
  if (errors.length) {
    fail(errors);
  }
  return { email, password: body.password };
}

function validateCreateUser(body) {
  requireBody(body);
  const name = cleanName(body.name);
  const email = cleanEmail(body.email);
  const errors = [nameError(name), emailError(email), roleError(body.role), passwordError(body.password, 'Password')].filter(Boolean);
  if (errors.length) {
    fail(errors);
  }
  return {
    name,
    email,
    role: body.role,
    password: body.password,
  };
}

function validateUpdateUser(body) {
  requireBody(body);
  const value = {};
  const errors = [];
  if (body.name !== undefined) {
    value.name = cleanName(body.name);
    const message = nameError(value.name);
    if (message) {
      errors.push(message);
    }
  }
  if (body.email !== undefined) {
    value.email = cleanEmail(body.email);
    const message = emailError(value.email);
    if (message) {
      errors.push(message);
    }
  }
  if (body.role !== undefined) {
    value.role = body.role;
    const message = roleError(body.role);
    if (message) {
      errors.push(message);
    }
  }
  if (body.password !== undefined && body.password !== '') {
    value.password = body.password;
    const message = passwordError(body.password, 'Password');
    if (message) {
      errors.push(message);
    }
  }
  if (!value.name && !value.email && !value.role && !value.password) {
    errors.push('Nothing to update.');
  }
  if (errors.length) {
    fail(errors);
  }
  return value;
}

function validateChangePassword(body) {
  requireBody(body);
  const errors = [];
  if (typeof body.currentPassword !== 'string' || body.currentPassword.length === 0) {
    errors.push('Current password is required.');
  }
  const nextError = passwordError(body.newPassword, 'New password');
  if (nextError) {
    errors.push(nextError);
  }
  if (
    typeof body.currentPassword === 'string' &&
    typeof body.newPassword === 'string' &&
    body.currentPassword === body.newPassword
  ) {
    errors.push('New password must be different from the current password.');
  }
  if (errors.length) {
    fail(errors);
  }
  return {
    currentPassword: body.currentPassword,
    newPassword: body.newPassword,
  };
}

function validateStatus(body) {
  requireBody(body);
  if (typeof body.active !== 'boolean') {
    throw httpError(400, 'Say whether the account is active.');
  }
  return { active: body.active };
}

function assertUuid(value) {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    throw httpError(400, 'User id is not valid.');
  }
  return value;
}

module.exports = {
  validateLogin,
  validateCreateUser,
  validateUpdateUser,
  validateChangePassword,
  validateStatus,
  assertUuid,
  cleanEmail,
  SAMPLE_PASSWORD,
};
