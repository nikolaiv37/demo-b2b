import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { useDarkMode } from '@/hooks/useDarkMode'
import { Building2, User, CreditCard, Moon } from 'lucide-react'

export function SettingsPage() {
  const { company, profile } = useAuth()
  const { isDark, toggle } = useDarkMode()

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and company settings
        </p>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="glass">
          <TabsTrigger value="company">
            <Building2 className="w-4 h-4 mr-2" />
            Company
          </TabsTrigger>
          <TabsTrigger value="profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="w-4 h-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Moon className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">Company Information</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  defaultValue={company?.name}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companySlug">Public Catalog URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    furnitrade.com/catalog/
                  </span>
                  <Input
                    id="companySlug"
                    defaultValue={company?.slug}
                    placeholder="your-company"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo">Company Logo</Label>
                {company?.logo_url && (
                  <img
                    src={company.logo_url}
                    alt="Company logo"
                    className="w-32 h-32 object-contain rounded-lg mb-2"
                  />
                )}
                <Input id="logo" type="file" accept="image/*" />
              </div>

              <Button>Save Changes</Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="profile">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">Profile Settings</h2>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  defaultValue={profile?.full_name || ''}
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  defaultValue={profile?.email}
                  placeholder="john@example.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={profile?.role} disabled />
              </div>

              <Button>Update Profile</Button>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="billing">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">Billing & Payments</h2>
            <div className="space-y-4">
              <div className="glass-card p-4">
                <p className="text-sm text-muted-foreground mb-2">
                  Stripe Account
                </p>
                {company?.stripe_id ? (
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">
                      Connected
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ID: {company.stripe_id}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm mb-2">
                      Connect your Stripe account to accept payments
                    </p>
                    <Button>Connect Stripe</Button>
                  </div>
                )}
              </div>

              <div className="glass-card p-4">
                <h3 className="font-semibold mb-2">Payment Methods</h3>
                <p className="text-sm text-muted-foreground">
                  No payment methods on file
                </p>
              </div>
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="appearance">
          <GlassCard>
            <h2 className="text-xl font-semibold mb-4">Appearance</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Toggle between light and dark theme
                  </p>
                </div>
                <Switch checked={isDark} onCheckedChange={toggle} />
              </div>

              <div className="glass-card p-6">
                <p className="text-sm font-medium mb-3">Theme Preview</p>
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

