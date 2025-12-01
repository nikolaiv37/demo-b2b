import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Package } from 'lucide-react'

export function LoginPage() {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const loginSchema = z.object({
    email: z.string().email(t('auth.invalidEmail')),
    password: z.string().min(6, t('auth.passwordMinLength')),
  })

  type LoginFormData = z.infer<typeof loginSchema>

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Check for email verification confirmation
  useEffect(() => {
    const verified = searchParams.get('verified')
    if (verified === 'true') {
      // Show success toast
      toast({
        title: t('auth.emailConfirmed'),
        description: t('auth.emailVerified'),
      })
      // Remove the query param from URL
      searchParams.delete('verified')
      setSearchParams(searchParams, { replace: true })
    }

    // Also check for Supabase auth hash in URL (from email confirmation)
    const hash = window.location.hash
    if (hash.includes('access_token') || hash.includes('type=recovery')) {
      // Supabase will automatically handle this with detectSessionInUrl: true
      // But we'll also show a toast if the session is successfully created
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          toast({
            title: t('auth.emailConfirmed'),
            description: t('auth.redirecting'),
          })
          // Clean the hash from URL
          window.history.replaceState({}, '', window.location.pathname)
          // Redirect to dashboard
          setTimeout(() => {
            navigate('/dashboard/')
          }, 1000)
        }
      })
    }
  }, [searchParams, setSearchParams, navigate, toast])

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) {
        // Provide more helpful error messages
        let errorMessage = error.message || t('auth.invalidEmailPassword')
        
        if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
          errorMessage = t('auth.checkEmailConfirm')
        } else if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
          errorMessage = t('auth.invalidCredentials')
        }
        
        toast({
          title: t('auth.loginFailed'),
          description: errorMessage,
          variant: 'destructive',
        })
        return
      }

      // Success! Show toast
      toast({
        title: t('auth.welcomeBack'),
        description: t('auth.successfullyLoggedIn'),
      })
      
      // Use window.location for reliable redirect after login
      // This ensures the session is properly recognized
      window.location.href = '/dashboard/'
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.unexpectedError')
      toast({
        title: t('auth.loginFailed'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    const email = getValues('email')
    if (!email) {
      toast({
        title: t('auth.emailRequired'),
        description: t('auth.enterEmailFirst'),
        variant: 'destructive',
      })
      return
    }

    setIsResettingPassword(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) throw error

      toast({
        title: t('auth.passwordResetEmailSent'),
        description: t('auth.checkEmailResetLink'),
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('auth.tryAgainLater')
      toast({
        title: t('auth.failedToSendResetEmail'),
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsResettingPassword(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <GlassCard>
          <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Package className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{t('auth.welcomeToFurniTrade')}</h1>
          <p className="text-muted-foreground">
            {t('auth.signInToAccount')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t('auth.email')}</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('auth.emailPlaceholder')}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={isResettingPassword}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {isResettingPassword ? t('auth.sending') : t('auth.forgotPassword')}
              </button>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('auth.signIn')}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm">
          <p className="text-muted-foreground">
            {t('auth.dontHaveAccount')}{' '}
            <Link
              to="/auth/signup"
              className="text-primary font-semibold hover:underline"
            >
              {t('auth.signUp')}
            </Link>
          </p>
        </div>
      </GlassCard>
      </div>
    </div>
  )
}

