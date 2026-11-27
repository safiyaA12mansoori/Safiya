'use strict';

const ROLES = Object.freeze([
  'Super Admin',
  'Admin',
  'Manager',
  'Cashier',
  'Inventory Staff',
  'Accountant',
]);

const ALL_ROLES = ROLES;

const PERMISSIONS = Object.freeze({
  'dashboard.view': ALL_ROLES,
  'users.manage': Object.freeze(['Super Admin', 'Admin']),
  'settings.view': ALL_ROLES,
});

function permissionsFor(role) {
  if (role === 'Super Admin') {
    return Object.keys(PERMISSIONS);
  }
  return Object.keys(PERMISSIONS).filter((code) => PERMISSIONS[code].includes(role));
}

function roleHasPermission(role, permission) {
  if (role === 'Super Admin') {
    return true;
  }
  const allowed = PERMISSIONS[permission];
  return Array.isArray(allowed) && allowed.includes(role);
}

module.exports = {
  ROLES,
  PERMISSIONS,
  permissionsFor,
  roleHasPermission,
};
