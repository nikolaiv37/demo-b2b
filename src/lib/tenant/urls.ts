import type { Tenant } from '@/types'
import { SUBDOMAIN_ROOT } from './constants'

function ensureLeadingSlash(path: string): string {
  return path.startsWith('/') ? path : `/${path}`
}

export function buildTenantUrl(tenant: Tenant, path = '/dashboard'): string {
  const normalizedPath = ensureLeadingSlash(path)

  if (tenant.primary_domain) {
    return `https://${tenant.primary_domain}${normalizedPath}`
  }

  return `https://${tenant.slug}.${SUBDOMAIN_ROOT}${normalizedPath}`
}
