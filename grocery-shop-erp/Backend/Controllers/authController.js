'use strict';

const authService = require('../Services/authService');
const { getConfig } = require('../Config');
const { permissionsFor } = require('../Config/roles');
const { setSessionCookie, clearSessionCookie } = require('../Utils/cookies');
const { asyncHandler } = require('../Utils/asyncHandler');
const { assertLoginAllowed, recordLoginFailure, clearLoginFailures } = require('../Middleware/loginThrottle');
const { cleanEmail } = require('../Utils/validate');

const login = asyncHandler(async (req, res) => {
  const email = cleanEmail(req.body && req.body.email);
  if (email) {
    assertLoginAllowed(req, email);
  }
  try {
    const result = await authService.login(req.body || {});
    if (email) {
      clearLoginFailures(req, email);
    }
    setSessionCookie(res, getConfig(), result.token);
    res.json({ user: result.user });
  } catch (error) {
    if (email && error.status === 401) {
      recordLoginFailure(req, email);
    }
    throw error;
  }
});

const sampleLogin = asyncHandler(async (req, res) => {
  const result = await authService.sampleLogin();
  setSessionCookie(res, getConfig(), result.token);
  res.json({ user: result.user, sample: true });
});

const logout = asyncHandler(async (req, res) => {
  await authService.endSession(req.user.id);
  clearSessionCookie(res, getConfig());
  res.json({ ok: true });
});

const me = asyncHandler(async (req, res) => {
  const config = getConfig();
  res.json({
    user: req.user,
    permissions: permissionsFor(req.user.role),
    phase: 1,
    currency: config.currency,
    timeZone: config.timeZone,
  });
});

const changePassword = asyncHandler(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body || {});
  setSessionCookie(res, getConfig(), result.token);
  res.json({ ok: true, user: result.user });
});

module.exports = {
  login,
  sampleLogin,
  logout,
  me,
  changePassword,
};
