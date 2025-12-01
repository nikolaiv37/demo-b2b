import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useToast } from '@/components/ui/use-toast'
import { CompanyForm, CompanyFormData } from '@/components/CompanyForm'
import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { Building2, User, CreditCard, Moon } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function SettingsPage() {
  const { t } = useTranslation()
  const { company, profile, user } = useAuth()
  const { isDark, toggle } = useDarkMode()
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

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
    } catch (error: any) {
      console.error('Error updating company:', error)
      toast({
        title: t('settings.updateFailed'),
        description: error.message || t('settings.failedToUpdate'),
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('settings.title')}</h1>
        <p className="text-muted-foreground">
          {t('settings.subtitle')}
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            {t('nav.company')}
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            {t('nav.profile')}
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 mr-2" />
            {t('nav.billing')}
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Moon className="w-4 h-4 mr-2" />
            {t('nav.appearance')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-6">{t('settings.companyInformation')}</h2>
            <CompanyForm
              company={company}
              onSubmit={handleCompanySubmit}
              isLoading={isSaving}
              showLogoUpload={true}
              mode="edit"
            />
          </GlassCard>
        </TabsContent>

        <TabsContent value="profile">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">{t('settings.profileSettings')}</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t('settings.fullName')}</Label>
                <Input
                  id="fullName"
                  defaultValue={profile?.full_name || ''}
                  placeholder={t('settings.fullNamePlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={profile?.email}
                  placeholder="john@example.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  {t('settings.emailCannotBeChanged')}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">{t('settings.role')}</Label>
                <Input id="role" value={profile?.role} disabled />
              </div>

              <Button>{t('settings.updateProfile')}</Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="billing">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">{t('settings.billingPayments')}</h2>
            <div className="space-y-4">
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  {t('settings.stripeAccount')}
                </p>
                {company?.stripe_id ? (
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      {t('settings.connected')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {company.stripe_id}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-2">
                      {t('settings.connectStripeAccount')}
                    </p>
                    <Button>{t('settings.connectStripe')}</Button>
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">{t('settings.paymentMethods')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('settings.noPaymentMethods')}
                </p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="appearance">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">{t('settings.appearance')}</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.darkMode')}</Label>
                  <p className="text-sm text-muted-foreground">
                    {t('settings.toggleTheme')}
                  </p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggle} />
              </div>

              <div className="glass-card p-6">
                <p className="text-sm font-medium mb-3">{t('settings.themePreview')}</p>
                <div className="space-y-2">
                  <div className="h-8 bg-primary rounded" />
                  <div className="h-8 bg-secondary rounded" />
                  <div className="h-8 bg-muted rounded" />
                </div>
              </div>
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  )
}

