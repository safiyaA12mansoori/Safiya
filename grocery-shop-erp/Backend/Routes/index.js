'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const { isSampleMode } = require('../Config/sampleMode');

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({
    ok: true,
    phase: 1,
    service: 'grocery-shop-erp',
    store: 'file',
    database: 'not-connected',
    sample: isSampleMode(),
  });
});

router.use('/auth', authRoutes);
router.use('/users', userRoutes);

module.exports = router;
