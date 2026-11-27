'use strict';

const productService = require('../Services/productService');
const { asyncHandler } = require('../Utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const products = await productService.listProducts();
  res.json({ products });
});

const create = asyncHandler(async (req, res) => {
  const product = await productService.createProduct(req.body || {});
  res.status(201).json({ product });
});

const update = asyncHandler(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, req.body || {});
  res.json({ product });
});

module.exports = {
  list,
  create,
  update,
};
