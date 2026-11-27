'use strict';

const express = require('express');
const { list, create, update } = require('../Controllers/productController');
const { authenticate } = require('../Middleware/authenticate');
const { requirePermission } = require('../Middleware/authorize');

const router = express.Router();

router.get('/', authenticate, requirePermission('products.view'), list);
router.post('/', authenticate, requirePermission('products.manage'), create);
router.patch('/:id', authenticate, requirePermission('products.manage'), update);

module.exports = router;
