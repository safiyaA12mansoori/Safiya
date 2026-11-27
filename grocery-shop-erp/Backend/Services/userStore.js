'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { getConfig } = require('../Config');

function clone(user) {
  return user ? { ...user } : null;
}

async function readStore(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.users)) {
      const error = new Error('The user file is not in the expected shape.');
      error.status = 500;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { users: [] };
    }
    throw error;
  }
}

async function writeStore(file, data) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

/**
 * Temporary user repository.
 * Phase 2 should replace this class with a PostgreSQL store that exposes
 * the same methods: list, findById, findByEmail, create, update, withTransaction.
 * Controllers must keep using the service layer, not this file.
 * There is no SQL on the request path in Phase 1.
 */
class JsonUserStore {
  constructor(file) {
    this.file = file;
    this.queue = Promise.resolve();
  }

  async list() {
    return this.withTransaction((tx) => tx.list());
  }

  async findById(id) {
    return this.withTransaction((tx) => tx.findById(id));
  }

  async findByEmail(email) {
    return this.withTransaction((tx) => tx.findByEmail(email));
  }

  async create(input) {
    return this.withTransaction((tx) => tx.create(input));
  }

  async update(id, patch) {
    return this.withTransaction((tx) => tx.update(id, patch));
  }

  async withTransaction(fn) {
    const run = this.queue.then(async () => {
      const data = await readStore(this.file);
      let written = false;
      const tx = {
        list() {
          return data.users.map((user) => clone(user));
        },
        findById(id) {
          return clone(data.users.find((user) => user.id === id));
        },
        findByEmail(email) {
          const needle = String(email || '').toLowerCase();
          return clone(data.users.find((user) => user.email === needle));
        },
        create(input) {
          const now = new Date().toISOString();
          const user = {
            id: input.id || crypto.randomUUID(),
            name: input.name,
            email: String(input.email).toLowerCase(),
            passwordHash: input.passwordHash,
            role: input.role,
            active: input.active !== false,
            tokenVersion: Number.isInteger(input.tokenVersion) ? input.tokenVersion : 0,
            createdAt: now,
            updatedAt: now,
          };
          data.users.push(user);
          written = true;
          return clone(user);
        },
        update(id, patch) {
          const user = data.users.find((item) => item.id === id);
          if (!user) {
            return null;
          }
          const allowed = ['name', 'email', 'passwordHash', 'role', 'active', 'tokenVersion'];
          for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
              user[key] = patch[key];
            }
          }
          user.updatedAt = new Date().toISOString();
          written = true;
          return clone(user);
        },
      };
      const result = await fn(tx);
      if (written) {
        await writeStore(this.file, data);
      }
      return result;
    });
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}

let instance = null;
let instanceFile = null;

function createUserStore() {
  const { dataFile } = getConfig();
  if (!instance || instanceFile !== dataFile) {
    instance = new JsonUserStore(dataFile);
    instanceFile = dataFile;
  }
  return instance;
}

module.exports = {
  JsonUserStore,
  createUserStore,
  toPublicUser,
};
