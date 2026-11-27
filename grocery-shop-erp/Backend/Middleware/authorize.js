'use strict';

const { roleHasPermission } = require('../Config/roles');
const { httpError } = require('../Utils/httpError');

function requirePermission(permission) {
  return function checkPermission(req, res, next) {
    if (!req.user) {
      next(httpError(401, 'Sign in required'));
      return;
    }
    if (!roleHasPermission(req.user.role, permission)) {
      next(httpError(403, 'You do not have access to this action'));
      return;
    }
    next();
  };
}

module.exports = { requirePermission };
