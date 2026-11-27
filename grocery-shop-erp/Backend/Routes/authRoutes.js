'use strict';

const express = require('express');
const { login, sampleLogin, logout, me, changePassword } = require('../Controllers/authController');
const { authenticate } = require('../Middleware/authenticate');

const router = express.Router();

router.post('/login', login);
router.post('/sample-login', sampleLogin);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/change-password', authenticate, changePassword);

module.exports = router;
