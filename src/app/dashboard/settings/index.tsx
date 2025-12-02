import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { CompanyForm, CompanyFormData } from '@/components/CompanyForm'
import { supabase } from '@/lib/supabase/client'
import { cn, slugify } from '@/lib/utils'
import { Building2, User, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

export function SettingsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { company, profile, user } = useAuth()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const [activeSection, setActiveSection] = useState<'company' | 'profile'>('company')

  // Sync active section with location hash (#company / #profile)
  useEffect(() => {
    if (location.hash === '#profile') {
      setActiveSection('profile')
    } else {
      setActiveSection('company')
    }
  }, [location.hash])

  const handleCompanySubmit = async (data: CompanyFormData, logoUrl: string | null) => {
    if (!user || !company) {
      toast({
        title: t('settings.error'),
        description: t('settings.mustBeLoggedIn'),
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const slug = slugify(data.companyName)

      const { data: updatedCompany, error } = await supabase
        .from('companies')
        .update({
          name: data.companyName,
          slug,
          logo_url: logoUrl,
          eik_bulstat: data.eikBulstat,
          vat_number: data.vatNumber,
          phone: data.phone,
          address: data.address,
          website: data.website || null,
        })
        .eq('id', company.id)
        .select()
        .single()

      if (error) throw error

      // Update company in store
      useAuthStore.getState().setCompany(updatedCompany)

      toast({
        title: t('settings.success'),
        description: t('settings.companyUpdated'),
      })
    } catch (error: unknown) {
      console.error('Error updating company:', error)
      toast({
        title: t('settings.updateFailed'),
        description:
          error instanceof Error ? error.message : t('settings.failedToUpdate'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // ----- Profile Settings (password only + email display) -----

  const passwordSchema = useMemo(
    () =>
      z
        .object({
          currentPassword: z.string().min(6, t('auth.passwordMinLength')),
          newPassword: z.string().min(6, t('auth.passwordMinLength')),
          confirmNewPassword: z.string().min(6, t('auth.passwordMinLength')),
        })
        .refine((values) => values.newPassword === values.confirmNewPassword, {
          path: ['confirmNewPassword'],
          message: t('settings.passwordsMustMatch'),
        }),
    [t]
  )

  type PasswordFormData = z.infer<typeof passwordSchema>

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    formState: {
      errors: passwordErrors,
      isDirty: isPasswordDirty,
      isValid: isPasswordValid,
      isSubmitting: isPasswordSubmitting,
    },
    reset: resetPasswordForm,
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    mode: 'onChange',
  })

  const onPasswordSubmit = async (data: PasswordFormData) => {
    if (!user) {
      toast({
        title: t('settings.error'),
        description: t('settings.mustBeLoggedIn'),
        variant: 'destructive',
      })
      return
    }

    setIsUpdatingPassword(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (error) throw error

      toast({
        title: t('settings.success'),
        description: t('settings.passwordUpdated'),
      })

      resetPasswordForm()
    } catch (error: unknown) {
      console.error('Error updating password:', error)
      toast({
        title: t('settings.updateFailed'),
        description:
          error instanceof Error ? error.message : t('settings.passwordUpdateFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[260px,1fr]">
        {/* Local Settings sidebar (within the Settings page) */}
        <GlassCard className="p-4 h-fit sticky top-20 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('nav.settings')}
          </p>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection('company')
                if (location.hash !== '#company') {
                  window.history.replaceState({}, '', `${location.pathname}#company`)
                }
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'company'
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              <Building2 className="w-4 h-4" />
              <span>{t('nav.company')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSection('profile')
                if (location.hash !== '#profile') {
                  window.history.replaceState({}, '', `${location.pathname}#profile`)
                }
              }}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors',
                activeSection === 'profile'
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted text-muted-foreground'
              )}
            >
              <User className="w-4 h-4" />
              <span>{t('nav.profile')}</span>
            </button>
          </div>
        </GlassCard>

        {/* Content */}
        <div className="space-y-6 pb-10">
          {activeSection === 'company' && (
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-6">
                {t('settings.companyInformation')}
              </h2>
              <CompanyForm
                company={company}
                onSubmit={handleCompanySubmit}
                isLoading={isSaving}
                showLogoUpload={true}
                mode="edit"
              />
            </GlassCard>
          )}

          {activeSection === 'profile' && (
            <>
              {/* Email display */}
              <GlassCard className="p-6 space-y-4">
                <div>
                  <h2 className="text-xl font-semibold mb-1">
                    {t('settings.profileSettings')}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.profileDescription')}
                  </p>
                </div>

                <div className="space-y-1.5 max-w-md">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile?.email || user?.email || ''}
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.emailCannotBeChanged')}
                  </p>
                </div>
              </GlassCard>

              {/* Change Password */}
              <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <h2 className="text-xl font-semibold">
                    {t('settings.changePassword')}
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t('settings.changePasswordDescription')}
                </p>

                <form
                  id="password-settings-form"
                  onSubmit={handleSubmitPassword(onPasswordSubmit)}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="currentPassword">
                        {t('settings.currentPassword')}
                      </Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        autoComplete="current-password"
                        {...registerPassword('currentPassword')}
                      />
                      {passwordErrors.currentPassword && (
                        <p className="text-sm text-destructive">
                          {passwordErrors.currentPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="newPassword">
                        {t('settings.newPassword')}
                      </Label>
                      <Input
                        id="newPassword"
                        type="password"
                        autoComplete="new-password"
                        {...registerPassword('newPassword')}
                      />
                      {passwordErrors.newPassword && (
                        <p className="text-sm text-destructive">
                          {passwordErrors.newPassword.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="confirmNewPassword">
                        {t('settings.confirmNewPassword')}
                      </Label>
                      <Input
                        id="confirmNewPassword"
                        type="password"
                        autoComplete="new-password"
                        {...registerPassword('confirmNewPassword')}
                      />
                      {passwordErrors.confirmNewPassword && (
                        <p className="text-sm text-destructive">
                          {passwordErrors.confirmNewPassword.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <p className="text-xs text-muted-foreground">
                      {t('settings.passwordNote')}
                    </p>
                    <Button
                      type="submit"
                      form="password-settings-form"
                      size="sm"
                      disabled={
                        isUpdatingPassword ||
                        !isPasswordDirty ||
                        !isPasswordValid ||
                        isPasswordSubmitting
                      }
                    >
                      {isUpdatingPassword && (
                        <span className="mr-2 h-3 w-3 animate-spin border-2 border-current border-t-transparent rounded-full" />
                      )}
                      {t('settings.updatePasswordButton')}
                    </Button>
                  </div>
                </form>
              </GlassCard>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
