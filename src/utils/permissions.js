/**
 * Screens are shown by permission, not by role name, so custom roles set
 * up in the web app work without an app update. The server checks the
 * same permissions on every request; this only hides what would fail.
 */
export function can(permissions, required) {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((permission) => permissions.includes(permission));
}

export function hasRole(user, role) {
  return Array.isArray(user?.roles) && user.roles.includes(role);
}
