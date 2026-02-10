export const MAIN_HOSTS = new Set([
  'centivon.com',
  'www.centivon.com',
  'centivon.vercel.app',
  ...(import.meta.env.DEV ? ['centivon.local'] : []),
])

export const PRIMARY_MAIN_HOST = 'centivon.com'
export const SUBDOMAIN_ROOT = 'centivon.com'

export const RESERVED_PATHS = new Set([
  'login',
  'signup',
  'auth',
  'dashboard',
  'api',
  'assets',
  'static',
  'favicon.ico',
])
