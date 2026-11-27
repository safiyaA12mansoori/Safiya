'use strict';

const userService = require('../Services/userService');
const { asyncHandler } = require('../Utils/asyncHandler');

const list = asyncHandler(async (req, res) => {
  const users = await userService.listUsers(req.query || {});
  res.json({ users });
});

const create = asyncHandler(async (req, res) => {
  const user = await userService.createUser(req.user, req.body || {});
  res.status(201).json({ user });
});

const update = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.user, req.params.id, req.body || {});
  res.json({ user });
});

const setStatus = asyncHandler(async (req, res) => {
  const user = await userService.setUserStatus(req.user, req.params.id, req.body || {});
  res.json({ user });
});

module.exports = {
  list,
  create,
  update,
  setStatus,
};
