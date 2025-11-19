import { useEffect, useState, useRef } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { Loader2 } from 'lucide-react'

/**
 * AuthGuard component that protects routes requiring authentication
 * 
 * - Shows a centered spinner while loading
 * - Redirects to /auth/login if no user (preserves the previous location)
 * - Handles email confirmation redirects to prevent infinite spinner
 * - 5-second timeout to prevent infinite loading
 * - Renders children if user exists
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [hasCheckedHash, setHasCheckedHash] = useState(false)
  const loadingStartTime = useRef<number | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Track when loading starts for timeout
  useEffect(() => {
    if (isLoading && !loadingStartTime.current) {
      loadingStartTime.current = Date.now()
    } else if (!isLoading) {
      loadingStartTime.current = null
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isLoading])

  // Timeout to prevent infinite spinner (only if user is NOT authenticated)
  // If user is authenticated, allow them to proceed even if profile is still loading
  useEffect(() => {
    if (isLoading && hasCheckedHash && !user) {
      // Only timeout if there's no user (not authenticated)
      // If user exists, they can proceed even if profile is loading
      timeoutRef.current = setTimeout(() => {
        console.error('AuthGuard: Loading timeout - no user found, redirecting to login')
        toast({
          title: 'Session expired',
          description: 'Please log in again.',
          variant: 'destructive',
        })
        navigate('/auth/login', { replace: true })
      }, 5000)
    } else {
      // Clear timeout if user exists or loading stopped
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [isLoading, hasCheckedHash, navigate, toast, user])

  // Check for email confirmation hash in URL (Supabase adds #access_token=... after confirmation)
  useEffect(() => {
    // Only check once and only if we're on a dashboard route
    if (hasCheckedHash || !location.pathname.startsWith('/dashboard')) {
      return
    }

    const hash = window.location.hash
    const hasConfirmationHash = hash.includes('access_token') || hash.includes('type=recovery')

    if (hasConfirmationHash) {
      // Check if Supabase has already processed the session
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // Session exists - Supabase already processed it, just clean the URL
          window.history.replaceState({}, '', window.location.pathname)
          setHasCheckedHash(true)
        } else {
          // No session yet - redirect to login to let Supabase process it there
          const newUrl = window.location.href.split('#')[0] // Remove hash
          window.history.replaceState({}, '', newUrl) // Clean URL
          navigate('/auth/login?verified=true', { replace: true })
          setHasCheckedHash(true)
        }
      })
    } else {
      setHasCheckedHash(true)
    }
  }, [location.pathname, navigate, hasCheckedHash])

  // Show spinner while loading (but only after we've checked for confirmation hash)
  if (isLoading && hasCheckedHash) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // If we're still checking the hash, show a brief loading state
  if (!hasCheckedHash && location.pathname.startsWith('/dashboard')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  // If user is authenticated but still loading profile, allow them to proceed
  // The profile will load in the background
  if (isAuthenticated && user && isLoading) {
    // User is authenticated, allow access even if profile is still loading
    // This prevents timeout redirects when profile fetch is slow
    return <>{children}</>
  }

  // Redirect to login if not authenticated, preserving the location they tried to access
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />
  }

  // User is authenticated, render children
  return <>{children}</>
}

