import { Button } from '@/components/ui/button'
import { GlassCard } from './GlassCard'
import { AlertCircle } from 'lucide-react'

interface ErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

export function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="max-w-md w-full text-center">
        <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
        <p className="text-muted-foreground mb-4">
          We apologize for the inconvenience. An error occurred while processing your request.
        </p>
        <details className="mb-4 text-left">
          <summary className="cursor-pointer text-sm font-medium mb-2">
            Error details
          </summary>
          <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-40">
            {error.message}
          </pre>
        </details>
        <Button onClick={resetErrorBoundary}>Try again</Button>
      </GlassCard>
    </div>
  )
}

