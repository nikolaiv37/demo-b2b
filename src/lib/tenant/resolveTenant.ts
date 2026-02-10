import { supabase } from '@/lib/supabase/client'
import { MAIN_HOSTS, RESERVED_PATHS, SUBDOMAIN_ROOT } from './constants'
import type { Tenant } from '@/types'

export type TenantSource = 'domain' | 'subdomain' | 'slug' | 'none'
export type DomainKind = 'main' | 'tenant' | 'unknown'

export interface TenantResolution {
  tenant: Tenant | null
  source: TenantSource
  domainKind: DomainKind
}

function normalizeHost(rawHost: string): string {
  return rawHost.toLowerCase().split(':')[0]
}

function firstPathSegment(pathname: string): string | null {
  const seg = pathname.replace(/^\/+/, '').split('/')[0]
  return seg || null
}

function isMainHost(host: string): boolean {
  return MAIN_HOSTS.has(host)
}

function isReservedPath(seg: string | null): boolean {
  return !!seg && RESERVED_PATHS.has(seg)
}

function getSubdomain(host: string): string | null {
  if (!host.endsWith(`.${SUBDOMAIN_ROOT}`)) return null
  const sub = host.replace(`.${SUBDOMAIN_ROOT}`, '')
  if (!sub || sub === 'www') return null
  return sub
}

async function fetchTenantById(tenantId: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, status, branding')
    .eq('id', tenantId)
    .single()

  if (error || !data) return null
  return data as Tenant
}

async function fetchTenantBySlug(slug: string): Promise<Tenant | null> {
  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug, status, branding')
    .eq('slug', slug)
    .single()

  if (error || !data) return null
  return data as Tenant
}

async function fetchPrimaryDomain(tenantId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('tenant_domains')
    .select('domain, is_primary, verified')
    .eq('tenant_id', tenantId)
    .eq('verified', true)
    .eq('is_primary', true)
    .maybeSingle()

  if (error || !data) return null
  return data.domain
}

function withPrimaryDomain(tenant: Tenant, primaryDomain: string | null): Tenant {
  return {
    ...tenant,
    primary_domain: primaryDomain ?? null,
  }
}

export async function resolveTenant(hostInput: string, pathname: string): Promise<TenantResolution> {
  const host = normalizeHost(hostInput)
  const seg1 = firstPathSegment(pathname)

  // 1) Verified custom domain
  const { data: domainRow } = await supabase
    .from('tenant_domains')
    .select('tenant_id, domain, is_primary, verified')
    .eq('domain', host)
    .eq('verified', true)
    .maybeSingle()

  if (domainRow?.tenant_id) {
    const tenant = await fetchTenantById(domainRow.tenant_id)
    const primaryDomain = domainRow.is_primary ? domainRow.domain : await fetchPrimaryDomain(domainRow.tenant_id)
    return {
      tenant: tenant ? withPrimaryDomain(tenant, primaryDomain) : null,
      source: 'domain',
      domainKind: 'tenant',
    }
  }

  // 2) Subdomain on centivon.com
  const subdomain = getSubdomain(host)
  if (subdomain) {
    const tenant = await fetchTenantBySlug(subdomain)
    const primaryDomain = tenant ? await fetchPrimaryDomain(tenant.id) : null
    return {
      tenant: tenant ? withPrimaryDomain(tenant, primaryDomain) : null,
      source: tenant ? 'subdomain' : 'none',
      domainKind: tenant ? 'tenant' : 'unknown',
    }
  }

  // 3) Slug fallback only on main hosts and non-reserved paths
  if (isMainHost(host) && seg1 && !isReservedPath(seg1)) {
    const tenant = await fetchTenantBySlug(seg1)
    const primaryDomain = tenant ? await fetchPrimaryDomain(tenant.id) : null
    return {
      tenant: tenant ? withPrimaryDomain(tenant, primaryDomain) : null,
      source: tenant ? 'slug' : 'none',
      domainKind: 'main',
    }
  }

  return {
    tenant: null,
    source: 'none',
    domainKind: isMainHost(host) ? 'main' : 'unknown',
  }
}

export function getSlugCandidate(pathname: string): string | null {
  const seg1 = firstPathSegment(pathname)
  if (!seg1 || isReservedPath(seg1)) return null
  return seg1
}
