import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Loader2, Building2, Upload } from 'lucide-react'

const onboardingSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
})

type OnboardingFormData = z.infer<typeof onboardingSchema>

export function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>('')
  
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
  })

  const companyName = watch('companyName')
  const slug = companyName ? slugify(companyName) : ''

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLogoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const onSubmit = async (data: OnboardingFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to complete onboarding',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      let logoUrl = null

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile)

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName)

        logoUrl = publicUrl
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.companyName,
          slug,
          logo_url: logoUrl,
        })
        .select()
        .single()

      if (companyError) throw companyError

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: company.id,
          full_name: data.fullName,
          role: 'admin',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      toast({
        title: 'Welcome to FurniTrade!',
        description: 'Your account has been set up successfully.',
      })

      navigate('/dashboard/')
    } catch (error: any) {
      toast({
        title: 'Onboarding failed',
        description: error.message || 'Failed to complete onboarding',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const progress = (step / 3) * 100

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard className="w-full max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Setup</h1>
          <p className="text-muted-foreground mb-4">
            Step {step} of 3: Let's set up your company
          </p>
          <Progress value={progress} />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Building2 className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Company Information</h2>
                  <p className="text-sm text-muted-foreground">
                    Tell us about your business
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Acme Furniture Co."
                  {...register('companyName')}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">
                    {errors.companyName.message}
                  </p>
                )}
              </div>

              {slug && (
                <div className="p-3 glass-card">
                  <p className="text-sm text-muted-foreground">
                    Your catalog URL will be:
                  </p>
                  <p className="font-mono text-primary font-semibold">
                    furnitrade.com/catalog/{slug}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name *</Label>
                <Input
                  id="fullName"
                  placeholder="John Doe"
                  {...register('fullName')}
                />
                {errors.fullName && (
                  <p className="text-sm text-destructive">
                    {errors.fullName.message}
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setStep(2)}
                className="w-full"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-6">
                <Upload className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">Company Logo</h2>
                  <p className="text-sm text-muted-foreground">
                    Upload your logo (optional)
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg">
                {logoPreview ? (
                  <div className="space-y-4">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="w-32 h-32 object-contain rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setLogoFile(null)
                        setLogoPreview('')
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-sm font-semibold mb-2">
                      Click to upload logo
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG up to 5MB
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  className="flex-1"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold mb-2">Review & Confirm</h2>
                <p className="text-sm text-muted-foreground">
                  Please review your information
                </p>
              </div>

              <div className="glass-card p-6 space-y-4">
                {logoPreview && (
                  <div className="flex justify-center">
                    <img
                      src={logoPreview}
                      alt="Company logo"
                      className="w-24 h-24 object-contain rounded-lg"
                    />
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Company Name</p>
                  <p className="font-semibold">{companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Catalog URL</p>
                  <p className="font-mono text-sm">
                    furnitrade.com/catalog/{slug}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Your Name</p>
                  <p className="font-semibold">{watch('fullName')}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Complete Setup
                </Button>
              </div>
            </div>
          )}
        </form>
      </GlassCard>
    </div>
  )
}

