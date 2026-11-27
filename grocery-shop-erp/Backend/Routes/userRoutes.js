'use strict';

const express = require('express');
const { list, create, update, setStatus } = require('../Controllers/userController');
const { authenticate } = require('../Middleware/authenticate');
const { requirePermission } = require('../Middleware/authorize');

const router = express.Router();

router.use(authenticate, requirePermission('users.manage'));
router.get('/', list);
router.post('/', create);
router.patch('/:id', update);
router.patch('/:id/status', setStatus);

module.exports = router;
