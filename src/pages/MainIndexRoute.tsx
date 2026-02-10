import { useAuth } from '@/hooks/useAuth'
import { useTenantMemberships } from '@/hooks/useTenantMemberships'
import { TenantSelector } from '@/pages/TenantSelector'
import { NoTenantState } from '@/pages/NoTenantState'
import { PlatformLoginPage } from '@/app/auth/platform-login'

/**
 * Shown on the app host (centivon.vercel.app) when no tenant is resolved.
 * Unauthenticated → platform email-first login.
 * Authenticated   → workspace selector (no auto-redirect).
 */
export function MainIndexRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const { data: memberships = [], isLoading: membershipsLoading } = useTenantMemberships()

  if (!isAuthenticated) {
    return <PlatformLoginPage />
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

  return <TenantSelector />
}
