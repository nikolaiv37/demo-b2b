import { Navigate } from 'react-router-dom'
import { useTenant } from '@/lib/tenant/TenantProvider'

export function DomainGuardTenantOnly({ children }: { children: React.ReactNode }) {
  const { tenant, domainKind } = useTenant()

  if (!tenant && domainKind === 'main') {
    return <Navigate to="/" replace />
  }

  if (!tenant) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
