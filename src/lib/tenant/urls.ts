import type { Tenant } from '@/types'
import { APP_HOST, SLUG_PREFIX } from './constants'

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Build a URL to reach a tenant.
 *
 * Priority:
 *  1. Verified primary_domain (unless it ends in .local — treat as misconfiguration)
 *  2. App host with /t/:slug fallback
 */
export function buildTenantUrl(tenant: Tenant, path = '/dashboard'): string {
  const normalizedPath = ensureLeadingSlash(path)

  // Safety: never link to a .local domain in production
  if (tenant.primary_domain && !tenant.primary_domain.endsWith('.local')) {
    return `https://${tenant.primary_domain}${normalizedPath}`
  }

  return `https://${APP_HOST}${SLUG_PREFIX}/${tenant.slug}${normalizedPath}`
}
