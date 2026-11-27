'use strict';

const http = require('http');

function request(urlString, options = {}) {
  const url = new URL(urlString);
  const payload = options.body === undefined ? null : Buffer.from(JSON.stringify(options.body));
  const headers = { ...(options.headers || {}) };
  if (payload) {
    headers['content-type'] = 'application/json';
    headers['content-length'] = String(payload.length);
  }
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: `${url.pathname}${url.search}`,
        method: options.method || 'GET',
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let data = null;
          if (!options.raw && text) {
            try {
              data = JSON.parse(text);
            } catch {
              data = { raw: text };
            }
          }
          const setCookie = res.headers['set-cookie'] || [];
          const session = setCookie.find((item) => item.startsWith('gs_session=')) || '';
          resolve({
            status: res.statusCode,
            data,
            text,
            session,
            cookieHeader: session ? session.split(';')[0] : '',
          });
        });
      }
    );
    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function listen(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1');
    server.once('listening', () => {
      const { port } = server.address();
      resolve({ server, base: `http://127.0.0.1:${port}` });
    });
    server.once('error', reject);
  });
}

module.exports = { request, listen };
