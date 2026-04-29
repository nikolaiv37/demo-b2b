import { useMemo, useState } from 'react'
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

type SettingsSection = 'company' | 'integrations'

export function SettingsPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const { company, user, isAdmin } = useAuth()
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const activeSection = useMemo<SettingsSection>(() => {
    if (location.hash === '#integrations' && isAdmin && demoFeatures.econt) {
      return 'integrations'
    }
    return 'company'
  }, [location.hash, isAdmin])

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

  return (
    <div className="max-w-5xl space-y-6 pb-10">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {activeSection === 'integrations'
            ? t('settings.integrationsSubtitle')
            : t('settings.companySubtitle')}
        </p>
      </div>

      {activeSection === 'integrations' && isAdmin && demoFeatures.econt ? (
        <EcontIntegrationSettings />
      ) : (
        <GlassCard className="p-6">
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
      )}
    </div>
  )
}
