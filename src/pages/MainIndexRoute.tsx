import { useEffect } from 'react'
import LandingPage from '@/pages/LandingPage'
import { useAuth } from '@/hooks/useAuth'
import { useTenantMemberships } from '@/hooks/useTenantMemberships'
import { TenantSelector } from '@/pages/TenantSelector'
import { NoTenantState } from '@/pages/NoTenantState'
import { buildTenantUrl } from '@/lib/tenant/urls'

export function MainIndexRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const { data: memberships = [], isLoading: membershipsLoading } = useTenantMemberships()

  useEffect(() => {
    if (!isAuthenticated || membershipsLoading) return

    if (memberships.length === 1 && memberships[0]) {
      const tenant = memberships[0].tenant
      const targetUrl = buildTenantUrl(tenant, '/dashboard')
      window.location.assign(targetUrl)
    }
  }, [isAuthenticated, memberships, membershipsLoading])

  if (!isAuthenticated) {
    return <LandingPage />
  }

  if (isLoading || membershipsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[color:var(--base)]">
        <div className="h-6 w-6 border-2 border-[color:var(--ink-12)] border-t-[color:var(--landing-accent)] rounded-full animate-spin" />
      </div>
    )
  }

  if (memberships.length === 0) {
    return <NoTenantState />
  }

  if (memberships.length === 1) {
    return null
  }

  return <TenantSelector />
}
