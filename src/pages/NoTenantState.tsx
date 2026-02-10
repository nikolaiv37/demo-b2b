import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Link } from 'react-router-dom'
import { Building2 } from 'lucide-react'

export function NoTenantState() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center">
        <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">No tenant linked</h1>
        <p className="text-muted-foreground mb-6">
          Your account is not linked to any tenant yet. Create a tenant or request access from your administrator.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Link to="/auth/signup">
            <Button>Create tenant</Button>
          </Link>
        </div>
      </GlassCard>
    </div>
  )
}
