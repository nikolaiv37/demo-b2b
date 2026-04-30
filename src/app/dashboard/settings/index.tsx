import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/GlassCard'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { CompanyForm, CompanyFormData } from '@/components/CompanyForm'
import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useTenant } from '@/lib/tenant/TenantProvider'
import { EcontIntegrationSettings } from '@/components/integrations/EcontIntegrationSettings'
import { demoFeatures } from '@/config/features'
import { Badge } from '@/components/ui/badge'
import { Building2, Mail, Phone, Shield, UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

type SettingsSection = 'company' | 'integrations'

export function SettingsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { company, profile, user, isAdmin } = useAuth()
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    phone: '',
    companyName: '',
  })

  const activeSection = useMemo<SettingsSection>(() => {
    if (location.hash === '#integrations' && isAdmin && demoFeatures.econt) {
      return 'integrations'
    }
    return 'company'
  }, [location.hash, isAdmin])

  useEffect(() => {
    if (!location.hash || activeSection === 'integrations') return
    const element = document.getElementById(location.hash.slice(1))
    if (element) {
      requestAnimationFrame(() => {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
  }, [activeSection, location.hash])

  useEffect(() => {
    setProfileForm({
      fullName: profile?.full_name || '',
      phone: profile?.phone || '',
      companyName: company?.name || profile?.company_name || '',
    })
  }, [company?.name, profile?.company_name, profile?.full_name, profile?.phone])

  const handleCompanySubmit = async (data: CompanyFormData, logoUrl: string | null) => {
    if (!user || !company || !tenantId) {
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
          city: data.city,
          address: data.address,
          website: data.website || null,
          mol: data.mol,
          bank_name: data.bankName,
          iban: data.iban,
          bic: data.bic,
        })
        .eq('id', company.id)
        .eq('tenant_id', tenantId)
        .select()
        .single()

      if (error) throw error

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

  const canEditCompanyName = Boolean(company && tenantId)
  const trimmedFullName = profileForm.fullName.trim()
  const trimmedPhone = profileForm.phone.trim()
  const trimmedCompanyName = profileForm.companyName.trim()
  const currentFullName = profile?.full_name || ''
  const currentPhone = profile?.phone || ''
  const currentCompanyName = company?.name || profile?.company_name || ''
  const isProfileDirty =
    trimmedFullName !== currentFullName ||
    trimmedPhone !== currentPhone ||
    trimmedCompanyName !== currentCompanyName

  const handleProfileSave = async () => {
    if (!user) {
      toast({
        title: t('settings.error'),
        description: t('settings.mustBeLoggedIn'),
        variant: 'destructive',
      })
      return
    }

    if (trimmedFullName.length < 2) {
      toast({
        title: t('settings.error'),
        description: t('settings.fullNameMinLength'),
        variant: 'destructive',
      })
      return
    }

    if (canEditCompanyName && trimmedCompanyName.length < 2) {
      toast({
        title: t('settings.error'),
        description: t('company.companyNameMinLength'),
        variant: 'destructive',
      })
      return
    }

    setIsSavingProfile(true)

    try {
      let nextCompany = company

      if (company && tenantId && trimmedCompanyName !== currentCompanyName) {
        const { data: updatedCompany, error: companyError } = await supabase
          .from('companies')
          .update({
            name: trimmedCompanyName,
            slug: slugify(trimmedCompanyName),
          })
          .eq('id', company.id)
          .eq('tenant_id', tenantId)
          .select()
          .single()

        if (companyError) throw companyError
        nextCompany = updatedCompany
        useAuthStore.getState().setCompany(updatedCompany)
      }

      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: trimmedFullName,
          phone: trimmedPhone || null,
        })
        .eq('id', user.id)
        .select()
        .single()

      if (profileError) throw profileError

      useAuthStore.getState().setProfile({
        ...(profile ?? {}),
        ...updatedProfile,
        company_name: nextCompany?.name || profile?.company_name || null,
        email: profile?.email ?? user.email ?? null,
      })

      setProfileForm({
        fullName: updatedProfile.full_name || '',
        phone: updatedProfile.phone || '',
        companyName: nextCompany?.name || '',
      })

      toast({
        title: t('settings.success'),
        description: t('settings.profileUpdated'),
      })
    } catch (error: unknown) {
      console.error('Error updating profile settings:', error)
      toast({
        title: t('settings.updateFailed'),
        description:
          error instanceof Error ? error.message : t('settings.profileUpdateFailed'),
        variant: 'destructive',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="max-w-5xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {activeSection === 'integrations'
            ? t('settings.integrationsSubtitle')
            : t('settings.subtitle')}
        </p>
      </div>

      {activeSection === 'integrations' && isAdmin && demoFeatures.econt ? (
        <EcontIntegrationSettings />
      ) : (
        <>
          <GlassCard id="profile" className="p-6 scroll-mt-24">
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">
                  {t('settings.profileSettings')}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t('settings.profileSectionDescription')}
                </p>
              </div>

              <div className="rounded-2xl border border-border/60 bg-muted/20 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-semibold text-white shadow-sm">
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={profile?.full_name || t('settings.avatarAlt')}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-semibold">
                        {trimmedFullName || t('settings.notProvided')}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">
                        {trimmedCompanyName || t('settings.notProvided')}
                      </p>
                    </div>
                  </div>

                  <Badge variant="secondary" className="w-fit">
                    <Shield className="mr-1 h-3.5 w-3.5" />
                    {isAdmin ? t('settings.admin') : t('settings.member')}
                  </Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <ProfileInfo
                    icon={UserRound}
                    label={t('settings.fullName')}
                    value={trimmedFullName}
                  />
                  <ProfileInfo
                    icon={Mail}
                    label={t('settings.loginEmail')}
                    value={profile?.email || user?.email}
                    readOnlyHint={t('settings.emailCannotBeChanged')}
                  />
                  <ProfileInfo
                    icon={Phone}
                    label={t('settings.phone')}
                    value={trimmedPhone || company?.phone}
                  />
                  <ProfileInfo
                    icon={Building2}
                    label={t('settings.companyName')}
                    value={trimmedCompanyName}
                  />
                </div>
              </div>

              <div className="grid gap-4 rounded-2xl border border-border/60 bg-background p-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-full-name">{t('settings.fullName')}</Label>
                  <Input
                    id="profile-full-name"
                    value={profileForm.fullName}
                    onChange={(e) =>
                      setProfileForm((current) => ({ ...current, fullName: e.target.value }))
                    }
                    placeholder={t('settings.fullNamePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-phone">{t('settings.phone')}</Label>
                  <Input
                    id="profile-phone"
                    value={profileForm.phone}
                    onChange={(e) =>
                      setProfileForm((current) => ({ ...current, phone: e.target.value }))
                    }
                    placeholder={t('settings.phonePlaceholder')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-company-name">{t('settings.companyName')}</Label>
                  <Input
                    id="profile-company-name"
                    value={profileForm.companyName}
                    onChange={(e) =>
                      setProfileForm((current) => ({ ...current, companyName: e.target.value }))
                    }
                    placeholder={t('company.companyNamePlaceholder')}
                    disabled={!canEditCompanyName}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="profile-email">{t('settings.loginEmail')}</Label>
                  <Input
                    id="profile-email"
                    value={profile?.email || user?.email || ''}
                    readOnly
                    disabled
                  />
                  <p className="text-xs text-muted-foreground">
                    {t('settings.emailCannotBeChanged')}
                  </p>
                </div>

                <div className="md:col-span-2 flex justify-end">
                  <Button
                    onClick={handleProfileSave}
                    disabled={!isProfileDirty || isSavingProfile}
                  >
                    {isSavingProfile ? t('general.saving') : t('settings.saveProfile')}
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border/70 bg-background/60 p-4">
                <p className="text-sm font-medium">{t('settings.passwordHidden')}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('settings.passwordHiddenDescription')}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard id="company" className="p-6 scroll-mt-24">
            <h2 className="text-xl font-semibold mb-2">
              {t('settings.companyInformation')}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {t('settings.companyInformationDescription')}
            </p>
            <CompanyForm
              company={company}
              onSubmit={handleCompanySubmit}
              isLoading={isSaving}
              showLogoUpload={true}
              mode="edit"
            />
          </GlassCard>
        </>
      )}
    </div>
  )
}

function ProfileInfo({
  icon: Icon,
  label,
  value,
  readOnlyHint,
}: {
  icon: typeof UserRound
  label: string
  value?: string | null
  readOnlyHint?: string
}) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-border/60 bg-background p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span>{label}</span>
      </div>
      <p className="break-words text-sm font-medium">
        {value && value.trim().length > 0 ? value : t('settings.notProvided')}
      </p>
      {readOnlyHint ? (
        <p className="mt-2 text-xs text-muted-foreground">{readOnlyHint}</p>
      ) : null}
    </div>
  )
}
