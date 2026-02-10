import { Navigate } from 'react-router-dom'
import { useTenant } from '@/lib/tenant/TenantProvider'

export function SlugOnlyGuard({ children }: { children: React.ReactNode }) {
  const { source, domainKind } = useTenant()

  if (source !== 'slug') {
    if (domainKind === 'tenant') {
      return <Navigate to="/dashboard" replace />
    }
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
