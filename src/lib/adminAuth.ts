// Simple admin authentication utility
export function isAdminAuthenticated() {
  return localStorage.getItem('admin-auth') === 'true';
}

export function setAdminAuthenticated(value: boolean) {
  localStorage.setItem('admin-auth', value ? 'true' : 'false');
}
