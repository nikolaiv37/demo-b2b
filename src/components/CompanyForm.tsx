import { useState, useCallback, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { Company } from '@/types'
import {
  Building2,
  Upload,
  Phone,
  MapPin,
  Globe,
  FileText,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const companyFormSchema = z.object({
  companyName: z.string().min(2, 'Company name must be at least 2 characters'),
  eikBulstat: z.string().min(1, 'ЕИК / BULSTAT is required'),
  vatNumber: z.string().min(1, 'VAT Number (ДДС №) is required'),
  phone: z.string().min(1, 'Company phone is required'),
  address: z.string().min(10, 'Address must be at least 10 characters'),
  website: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  logo: z.instanceof(File).optional(),
})

export type CompanyFormData = z.infer<typeof companyFormSchema>

interface CompanyFormProps {
  company?: Company | null
  onSubmit: (data: CompanyFormData, logoUrl: string | null) => Promise<void>
  isLoading?: boolean
  showLogoUpload?: boolean
  mode?: 'onboarding' | 'edit'
}

export function CompanyForm({
  company,
  onSubmit,
  isLoading = false,
  showLogoUpload = true,
  mode = 'edit',
}: CompanyFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string>(
    company?.logo_url || ''
  )
  const [isDragging, setIsDragging] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companyFormSchema),
    mode: 'onChange',
    defaultValues: company
      ? {
          companyName: company.name,
          eikBulstat: company.eik_bulstat || '',
          vatNumber: company.vat_number || '',
          phone: company.phone || '',
          address: company.address || '',
          website: company.website || '',
        }
      : undefined,
  })

  const companyName = watch('companyName')
  const slug = companyName ? slugify(companyName) : ''

  // Update form when company changes
  useEffect(() => {
    if (company) {
      reset({
        companyName: company.name,
        eikBulstat: company.eik_bulstat || '',
        vatNumber: company.vat_number || '',
        phone: company.phone || '',
        address: company.address || '',
        website: company.website || '',
      })
      setLogoPreview(company.logo_url || '')
    }
  }, [company, reset])

  const handleLogoChange = useCallback(
    (file: File) => {
      if (file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: 'Invalid file type',
            description: 'Please upload an image file',
            variant: 'destructive',
          })
          return
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast({
            title: 'File too large',
            description: 'Please upload an image smaller than 5MB',
            variant: 'destructive',
          })
          return
        }

        setLogoFile(file)
        setValue('logo', file)
        const reader = new FileReader()
        reader.onloadend = () => {
          setLogoPreview(reader.result as string)
        }
        reader.readAsDataURL(file)
      }
    },
    [setValue, toast]
  )

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleLogoChange(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleLogoChange(file)
    }
  }

  const removeLogo = () => {
    setLogoFile(null)
    setLogoPreview('')
    setValue('logo', undefined)
  }

  const onFormSubmit = async (data: CompanyFormData) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in',
        variant: 'destructive',
      })
      return
    }

    let logoUrl = logoPreview && !logoFile ? logoPreview : null

    // Upload logo if a new file was selected
    if (logoFile) {
      try {
        const fileExt = logoFile.name.split('.').pop()
        const fileName = `${user.id}-${Date.now()}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('logos')
          .upload(fileName, logoFile, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('logos')
          .getPublicUrl(fileName)

        logoUrl = publicUrl
      } catch (error: any) {
        toast({
          title: 'Logo upload failed',
          description: error.message || 'Failed to upload logo',
          variant: 'destructive',
        })
        return
      }
    }

    await onSubmit(data, logoUrl)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <div className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="companyName" className="text-base">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="companyName"
            placeholder="Acme Furniture Co."
            className="h-12"
            {...register('companyName')}
          />
          {errors.companyName && (
            <p className="text-sm text-destructive">
              {errors.companyName.message}
            </p>
          )}
        </div>

        {slug && (
          <div className="p-4 glass-card border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">
              Your catalog URL will be:
            </p>
            <p className="font-mono text-primary font-semibold text-sm">
              /catalog/{slug}
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="eikBulstat" className="text-base">
              ЕИК / BULSTAT <span className="text-destructive">*</span>
            </Label>
            <Input
              id="eikBulstat"
              placeholder="123456789"
              className="h-12"
              {...register('eikBulstat')}
            />
            {errors.eikBulstat && (
              <p className="text-sm text-destructive">
                {errors.eikBulstat.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="vatNumber" className="text-base">
              VAT Number (ДДС №) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vatNumber"
              placeholder="BG123456789"
              className="h-12"
              {...register('vatNumber')}
            />
            {errors.vatNumber && (
              <p className="text-sm text-destructive">
                {errors.vatNumber.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4" />
            Company Phone <span className="text-destructive">*</span>
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="+359 888 123 456"
            className="h-12"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="address" className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Full Company Address <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="address"
            placeholder="Street address, City, Postal Code, Country"
            className="min-h-[100px] resize-none"
            {...register('address')}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="website" className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Company Website{' '}
            <span className="text-muted-foreground text-sm">(optional)</span>
          </Label>
          <Input
            id="website"
            type="url"
            placeholder="https://www.example.com"
            className="h-12"
            {...register('website')}
          />
          {errors.website && (
            <p className="text-sm text-destructive">{errors.website.message}</p>
          )}
        </div>

        {showLogoUpload && (
          <div className="space-y-2">
            <Label className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4" />
              Company Logo{' '}
              <span className="text-muted-foreground text-sm">(optional)</span>
            </Label>
            <div
              className={cn(
                'relative flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-xl transition-all duration-200',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-muted-foreground/30 hover:border-primary/50',
                logoPreview && 'border-primary/50 bg-primary/5'
              )}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {logoPreview ? (
                <div className="space-y-4 w-full">
                  <div className="flex justify-center">
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="w-48 h-48 object-contain rounded-lg glass-card p-4"
                      />
                      <button
                        type="button"
                        onClick={removeLogo}
                        className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('logo-input')?.click()}
                      className="w-full sm:w-auto"
                    >
                      Change Logo
                    </Button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer text-center w-full">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-4 rounded-full glass bg-primary/10">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-base font-semibold mb-1">
                        {isDragging
                          ? 'Drop your logo here'
                          : 'Click to upload or drag and drop'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG, or SVG up to 5MB
                      </p>
                    </div>
                  </div>
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileInput}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button type="submit" size="lg" disabled={isLoading} className="min-w-[140px]">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {mode === 'onboarding' ? 'Processing...' : 'Saving...'}
            </>
          ) : (
            mode === 'onboarding' ? (
              <>
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            ) : (
              'Save Changes'
            )
          )}
        </Button>
      </div>
    </form>
  )
}

