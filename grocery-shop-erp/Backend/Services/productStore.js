'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { getConfig } = require('../Config');

function clone(product) {
  return product ? { ...product } : null;
}

async function readStore(file) {
  try {
    const text = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.products)) {
      const error = new Error('The product file is not in the expected shape.');
      error.status = 500;
      throw error;
    }
    return parsed;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { products: [] };
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

function toPublicProduct(product) {
  if (!product) {
    return null;
  }
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    category: product.category,
    packSize: product.packSize,
    unit: product.unit,
    pricePaise: product.pricePaise,
    active: product.active,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

class JsonProductStore {
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
          return data.products.map((product) => clone(product));
        },
        findById(id) {
          return clone(data.products.find((product) => product.id === id));
        },
        findBySku(sku) {
          const needle = String(sku || '').toUpperCase();
          return clone(data.products.find((product) => product.sku === needle));
        },
        create(input) {
          const now = new Date().toISOString();
          const product = {
            id: input.id || crypto.randomUUID(),
            sku: String(input.sku).toUpperCase(),
            name: input.name,
            category: input.category,
            packSize: input.packSize,
            unit: input.unit,
            pricePaise: input.pricePaise,
            active: input.active !== false,
            createdAt: now,
            updatedAt: now,
          };
          data.products.push(product);
          written = true;
          return clone(product);
        },
        update(id, patch) {
          const product = data.products.find((item) => item.id === id);
          if (!product) {
            return null;
          }
          const allowed = ['sku', 'name', 'category', 'packSize', 'unit', 'pricePaise', 'active'];
          for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(patch, key)) {
              product[key] = key === 'sku' ? String(patch[key]).toUpperCase() : patch[key];
            }
          }
          product.updatedAt = new Date().toISOString();
          written = true;
          return clone(product);
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

function createProductStore() {
  const { productsFile } = getConfig();
  if (!instance || instanceFile !== productsFile) {
    instance = new JsonProductStore(productsFile);
    instanceFile = productsFile;
  }
  return instance;
}

module.exports = {
  JsonProductStore,
  createProductStore,
  toPublicProduct,
};
