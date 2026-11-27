'use strict';

const { createUserStore, toPublicUser } = require('./userStore');
const { hashPassword } = require('../Utils/passwords');
const { validateCreateUser, validateUpdateUser, validateStatus, assertUuid } = require('../Utils/validate');
const { httpError } = require('../Utils/httpError');

function assertCanManage(actor, target, nextRole) {
  if (actor.role === 'Super Admin') {
    return;
  }
  if ((target && target.role === 'Super Admin') || nextRole === 'Super Admin') {
    throw httpError(403, 'Only a Super Admin can manage a Super Admin account');
  }
}

function assertStillHasSuperAdmin(users, targetId, nextRole, nextActive) {
  const remaining = users.filter((user) => {
    if (user.id === targetId) {
      return nextRole === 'Super Admin' && nextActive;
    }
    return user.role === 'Super Admin' && user.active;
  });
  if (remaining.length === 0) {
    throw httpError(400, 'The shop needs at least one active Super Admin');
  }
}

async function listUsers(query) {
  const store = createUserStore();
  const q = typeof query.q === 'string' ? query.q.trim().toLowerCase() : '';
  const role = typeof query.role === 'string' ? query.role.trim() : '';
  let users = await store.list();
  if (role) {
    users = users.filter((user) => user.role === role);
  }
  if (q) {
    users = users.filter((user) => {
      const haystack = `${user.name} ${user.email} ${user.role}`.toLowerCase();
      return haystack.includes(q);
    });
  }
  users.sort((a, b) => a.name.localeCompare(b.name, 'en-IN'));
  return users.map(toPublicUser);
}

async function createUser(actor, body) {
  const input = validateCreateUser(body);
  assertCanManage(actor, null, input.role);
  const passwordHash = await hashPassword(input.password);
  const store = createUserStore();
  const user = await store.withTransaction((tx) => {
    if (tx.findByEmail(input.email)) {
      throw httpError(409, 'A user with this email already exists');
    }
    return tx.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash,
      active: true,
    });
  });
  return toPublicUser(user);
}

async function updateUser(actor, rawId, body) {
  const id = assertUuid(rawId);
  const input = validateUpdateUser(body);
  const store = createUserStore();
  const current = await store.findById(id);
  if (!current) {
    throw httpError(404, 'User not found');
  }
  assertCanManage(actor, current, input.role || current.role);
  if (actor.id === current.id && input.role && input.role !== current.role) {
    throw httpError(400, 'You cannot change your own role');
  }
  if (actor.id === current.id && input.password) {
    throw httpError(400, 'Use Change password to update your own password');
  }
  let passwordHash;
  if (input.password) {
    passwordHash = await hashPassword(input.password);
  }
  const updated = await store.withTransaction((tx) => {
    const fresh = tx.findById(id);
    if (!fresh) {
      throw httpError(404, 'User not found');
    }
    if (input.email && input.email !== fresh.email && tx.findByEmail(input.email)) {
      throw httpError(409, 'A user with this email already exists');
    }
    const nextRole = input.role || fresh.role;
    assertStillHasSuperAdmin(tx.list(), fresh.id, nextRole, fresh.active);
    const patch = {};
    if (input.name) {
      patch.name = input.name;
    }
    if (input.email) {
      patch.email = input.email;
    }
    if (input.role) {
      patch.role = input.role;
    }
    if (passwordHash) {
      patch.passwordHash = passwordHash;
      patch.tokenVersion = fresh.tokenVersion + 1;
    }
    return tx.update(id, patch);
  });
  return toPublicUser(updated);
}

async function setUserStatus(actor, rawId, body) {
  const id = assertUuid(rawId);
  const { active } = validateStatus(body);
  if (actor.id === id) {
    throw httpError(400, 'You cannot change the status of your own account');
  }
  const store = createUserStore();
  const current = await store.findById(id);
  if (!current) {
    throw httpError(404, 'User not found');
  }
  assertCanManage(actor, current, current.role);
  const updated = await store.withTransaction((tx) => {
    const fresh = tx.findById(id);
    if (!fresh) {
      throw httpError(404, 'User not found');
    }
    assertStillHasSuperAdmin(tx.list(), fresh.id, fresh.role, active);
    return tx.update(id, { active });
  });
  return toPublicUser(updated);
}

module.exports = {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
};
