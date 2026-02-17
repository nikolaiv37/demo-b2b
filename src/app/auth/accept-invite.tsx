import { useEffect, useState, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Loader2, CheckCircle2, AlertCircle, Mail, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useTenantPath } from '@/lib/tenant/TenantProvider'

type AcceptState = 'loading' | 'accepting' | 'success' | 'redirecting_setup' | 'error' | 'login_required' | 'wrong_account'

/**
 * Accept-invite page.
 *
 * Two ways a user can arrive here:
 * 1. Direct link: /auth/accept-invite?token=INVITATION_TOKEN
 * 2. Supabase email redirect: /auth/accept-invite?token=...#access_token=...
 *    (Supabase appends auth tokens as URL hash fragments)
 * 3. Fallback: /auth/accept-invite (no token — Supabase stripped the path/params).
 *    In this case we wait for the session, then look up the invitation by email.
 */
export function AcceptInvitePage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { withBase } = useTenantPath()
  const token = searchParams.get('token')
  const [state, setState] = useState<AcceptState>('loading')
  const [message, setMessage] = useState('')
  const [tenantSlug, setTenantSlug] = useState<string | null>(null)
  const acceptedRef = useRef(false) // prevent double-accept

  // Core accept logic
  const doAccept = async (inviteToken: string) => {
    if (acceptedRef.current) return
    acceptedRef.current = true
    setState('accepting')

    try {
      const { data, error } = await supabase.functions.invoke('accept-invite', {
        body: { token: inviteToken },
      })

      // supabase.functions.invoke returns error for non-2xx — but we now
      // always return 200 from the edge function, so check data instead
      const result = data || {}

      if (error && !result.error) {
        // Truly unexpected error (network, edge function crash, etc.)
        setState('error')
        setMessage(error.message || 'Failed to accept invitation.')
        acceptedRef.current = false
        return
      }

      if (result.error_code === 'email_mismatch') {
        setState('wrong_account')
        setMessage(result.error)
        setTenantSlug(result.tenant_slug || null)
        acceptedRef.current = false
        return
      }

      if (result.error_code === 'already_accepted') {
        // Already accepted — go to dashboard directly
        setState('success')
        setMessage('This invitation has already been accepted. You can go to your dashboard.')
        setTenantSlug(result.tenant_slug || null)
        return
      }

      if (result.error) {
        setState('error')
        setMessage(result.error)
        acceptedRef.current = false
        return
      }

      // Freshly accepted — redirect to client-setup for password + company confirmation
      setState('redirecting_setup')
      setTenantSlug(result.tenant_slug || null)

      const setupParams = new URLSearchParams()
      if (result.invitation_id) setupParams.set('invite', result.invitation_id)
      if (result.tenant_slug) setupParams.set('tenant', result.tenant_slug)

      // IMPORTANT: Use tenant-aware base paths. On tenant domains we must NOT
      // navigate to /t/:slug/*, because SlugOnlyGuard will bounce to /dashboard
      // and trigger the admin onboarding flow. withBase() resolves correctly
      // for both tenant domains and /t/:slug access.
      const setupBase = withBase('/auth/client-setup')
      const setupUrl = `${setupBase}?${setupParams.toString()}`

      // Small delay so the user sees the "accepted" state briefly
      setTimeout(() => {
        navigate(setupUrl, { replace: true })
      }, 800)
    } catch (err) {
      console.error('Accept invite error:', err)
      setState('error')
      setMessage('An unexpected error occurred. Please try again.')
      acceptedRef.current = false
    }
  }

  // Look up invitation by email (fallback when no token in URL)
  const lookupByEmail = async (userEmail: string): Promise<string | null> => {
    try {
      // Use the user's metadata first — the invite flow stores the token there
      const { data: { user } } = await supabase.auth.getUser()
      const metaToken = user?.user_metadata?.invitation_token
      if (metaToken) return metaToken

      // Fallback: query tenant_invitations by email via the RPC
      // (This works because the user is now authenticated and we can
      // find their pending invitation)
      const { data: invitations } = await supabase
        .from('tenant_invitations')
        .select('token')
        .eq('email', userEmail.toLowerCase())
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return invitations?.token ?? null
    } catch {
      return null
    }
  }

  useEffect(() => {
    let cancelled = false

    const init = async () => {
      // Check for Supabase error in URL hash (e.g. #error=access_denied&error_code=otp_expired)
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const hashError = hashParams.get('error_description')
      const errorCode = hashParams.get('error_code')

      if (hashError && errorCode === 'otp_expired') {
        // The Supabase email link expired — but we still have our invitation
        // token in the URL. Show the user a helpful message with a way forward.
        if (token) {
          const { data: inviteInfo } = await supabase.rpc('get_invitation_by_token', {
            invite_token: token,
          })
          if (inviteInfo) {
            setTenantSlug(inviteInfo.tenant_slug)
            setMessage(
              `The email link has expired, but your invitation to ${inviteInfo.tenant_name} is still valid. ` +
              `Ask the admin to resend the invite, or log in below if you already have an account.`
            )
          } else {
            setMessage('The email link has expired. Please ask the admin to resend your invitation.')
          }
          setState('login_required')
          return
        }
        setState('error')
        setMessage('The email link has expired. Please ask the admin to resend your invitation.')
        return
      }

      // Give Supabase client a moment to process hash tokens (#access_token=...)
      // that may be appended after email verification redirect.
      // detectSessionInUrl: true in the client config handles this automatically.
      await new Promise((r) => setTimeout(r, 500))
      if (cancelled) return

      const { data: { session } } = await supabase.auth.getSession()

      if (session && token) {
        // Best case: have both session and token
        await doAccept(token)
        return
      }

      if (session && !token) {
        // Supabase stripped the path/params — try to find the token by email
        const foundToken = await lookupByEmail(session.user.email!)
        if (cancelled) return

        if (foundToken) {
          await doAccept(foundToken)
        } else {
          // No pending invitation found — maybe already accepted
          setState('success')
          setMessage('Your account is ready. Head to the dashboard to get started.')
        }
        return
      }

      // No session yet
      if (token) {
        // Have token but no session — show invitation info + login prompt
        const { data: inviteInfo } = await supabase.rpc('get_invitation_by_token', {
          invite_token: token,
        })

        if (inviteInfo) {
          setMessage(`You've been invited to join ${inviteInfo.tenant_name}. Please check your email or log in to accept.`)
          setTenantSlug(inviteInfo.tenant_slug)
        } else {
          setMessage('Please log in or check your email to accept this invitation.')
        }
        setState('login_required')
      } else {
        // No token, no session — can't do anything useful
        setState('error')
        setMessage('Invalid invite link. Please use the link from your invitation email.')
      }
    }

    init()
    return () => { cancelled = true }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for auth changes — handles the case where Supabase processes
  // the hash tokens asynchronously after page load
  useEffect(() => {
    if (state === 'success' || state === 'accepting' || state === 'redirecting_setup') return

    const { data: subscription } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        if (acceptedRef.current) return

        if (token) {
          await doAccept(token)
        } else {
          // Find invitation by email
          const foundToken = await lookupByEmail(session.user.email!)
          if (foundToken) {
            await doAccept(foundToken)
          } else {
            setState('success')
            setMessage('Your account is ready. Head to the dashboard to get started.')
          }
        }
      }
    })

    return () => {
      subscription.subscription.unsubscribe()
    }
  }, [state, token]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleGoToDashboard = () => {
    navigate(withBase('/dashboard'))
  }

  const handleGoToLogin = () => {
    const returnUrl = token
      ? `/auth/accept-invite?token=${token}`
      : '/auth/accept-invite'
    navigate(`${withBase('/auth/login')}?redirect=${encodeURIComponent(returnUrl)}`)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-sky-50 dark:from-slate-950 dark:to-sky-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardContent className="pt-8 pb-8 px-8 text-center">
          {/* Loading / Accepting / Redirecting to setup */}
          {(state === 'loading' || state === 'accepting' || state === 'redirecting_setup') && (
            <div className="space-y-4">
              <div className="h-16 w-16 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
              </div>
              <h2 className="text-lg font-semibold">
                {state === 'loading' ? 'Verifying invitation...'
                  : state === 'redirecting_setup' ? 'Invitation accepted!'
                  : 'Accepting invitation...'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {state === 'redirecting_setup'
                  ? 'Redirecting to complete your account setup...'
                  : 'Please wait a moment.'}
              </p>
            </div>
          )}

          {/* Success */}
          {state === 'success' && (
            <div className="space-y-5">
              <div className="h-16 w-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">
                  Invitation Accepted
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <Button onClick={handleGoToDashboard} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
                Go to Dashboard
              </Button>
            </div>
          )}

          {/* Error */}
          {state === 'error' && (
            <div className="space-y-5">
              <div className="h-16 w-16 mx-auto rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-red-700 dark:text-red-400">
                  Something went wrong
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/')} className="w-full">
                Go Home
              </Button>
            </div>
          )}

          {/* Wrong Account — user is logged in but email doesn't match invitation */}
          {state === 'wrong_account' && (
            <div className="space-y-5">
              <div className="h-16 w-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
                <LogOut className="w-8 h-8 text-amber-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400">
                  Wrong Account
                </h2>
                <p className="text-sm text-muted-foreground">{message}</p>
                {tenantSlug && (
                  <p className="text-xs text-muted-foreground">
                    Tenant: <span className="font-medium">{tenantSlug}</span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Button
                  onClick={async () => {
                    await supabase.auth.signOut()
                    // Reload to clear session — the page will re-init and show login_required
                    window.location.reload()
                  }}
                  className="w-full gap-2 bg-amber-600 hover:bg-amber-700"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out and switch account
                </Button>
              </div>
            </div>
          )}

          {/* Login Required */}
          {state === 'login_required' && (
            <div className="space-y-5">
              <div className="h-16 w-16 mx-auto rounded-full bg-sky-500/10 flex items-center justify-center">
                <Mail className="w-8 h-8 text-sky-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold">You're Invited!</h2>
                <p className="text-sm text-muted-foreground">{message}</p>
                {tenantSlug && (
                  <p className="text-xs text-muted-foreground">
                    Tenant: <span className="font-medium">{tenantSlug}</span>
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <Button onClick={handleGoToLogin} className="w-full gap-2 bg-sky-600 hover:bg-sky-700">
                  Log in to accept
                </Button>
                <p className="text-xs text-muted-foreground">
                  Check your email for a sign-in link, or log in with your existing credentials.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
