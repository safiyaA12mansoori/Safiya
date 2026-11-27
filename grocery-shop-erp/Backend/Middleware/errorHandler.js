'use strict';

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err && (err.type === 'entity.parse.failed' || err instanceof SyntaxError)) {
    res.status(400).json({ error: 'Request body must be JSON' });
    return;
  }
  const status = Number(err && err.status) || 500;
  if (status >= 500) {
    console.error(err);
  }
  const message = status >= 500 ? 'Something went wrong' : err.message;
  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
