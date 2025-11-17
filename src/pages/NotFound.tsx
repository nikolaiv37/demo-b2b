import { Link } from 'react-router-dom'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Home, AlertCircle } from 'lucide-react'

export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center">
        <AlertCircle className="w-20 h-20 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-6xl font-bold mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">Page Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/">
          <Button>
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </Link>
      </GlassCard>
    </div>
  )
}

