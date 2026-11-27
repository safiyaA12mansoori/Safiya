'use strict';

const path = require('path');
const express = require('express');
const { assertJwtSecret, getConfig } = require('./Config');
const { enableSampleMode, isSampleMode } = require('./Config/sampleMode');
const apiRoutes = require('./Routes');
const { errorHandler } = require('./Middleware/errorHandler');

function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'"
  );
  if (req.path.startsWith('/api') || req.path.endsWith('.html') || req.path === '/') {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
}

function createApp() {
  enableSampleMode();
  const config = getConfig();
  assertJwtSecret(config.jwtSecret);
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', false);
  app.use(securityHeaders);
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', apiRoutes);
  app.use('/api', (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(express.static(path.join(config.projectRoot, 'Frontend'), { index: 'index.html', dotfiles: 'ignore' }));
  app.use((req, res) => {
    res.status(404).type('text/plain').send('Not found');
  });
  app.use(errorHandler);
  return app;
}

async function start() {
  let app;
  try {
    enableSampleMode();
    app = createApp();
    if (isSampleMode()) {
      const { seedSampleShop } = require('./Utils/seedSuperAdmin');
      await seedSampleShop();
    }
    const { ensureProductCatalog } = require('./Services/productService');
    await ensureProductCatalog();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  const config = getConfig();
  app.listen(config.port, () => {
    console.log('Grocery Shop ERP (Phase 1)');
    console.log(`Open http://127.0.0.1:${config.port}/login.html`);
    console.log('User store and product catalog: temporary JSON files. PostgreSQL is not connected.');
    if (isSampleMode()) {
      console.log('Sample shop mode is on. Use Enter the sample shop on the login page.');
    }
  });
}

if (require.main === module) {
  start();
}

module.exports = { createApp, start };
