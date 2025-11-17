import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { CartItem } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

const quoteFormSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters'),
  customerEmail: z.string().email('Invalid email address'),
  notes: z.string().optional(),
})

type QuoteFormData = z.infer<typeof quoteFormSchema>

interface QuoteModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: CartItem[]
  total: number
  onSubmit: (data: QuoteFormData) => Promise<void>
}

export function QuoteModal({
  open,
  onOpenChange,
  items,
  total,
  onSubmit,
}: QuoteModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
  })

  const handleFormSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true)
    try {
      await onSubmit(data)
      toast({
        title: 'Quote Requested',
        description: 'Your quote request has been submitted successfully.',
      })
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to submit quote request. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] glass">
        <DialogHeader>
          <DialogTitle>Request a Quote</DialogTitle>
          <DialogDescription>
            Fill in your details to receive a quote for the selected items.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <div className="space-y-4 py-4">
            {/* Quote Summary */}
            <div className="glass-card p-4 space-y-2">
              <h4 className="font-semibold">Quote Summary</h4>
              {items.map((item) => (
                <div
                  key={item.product.id}
                  className="flex justify-between text-sm"
                >
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>

            {/* Customer Details */}
            <div className="space-y-2">
              <Label htmlFor="customerName">Full Name *</Label>
              <Input
                id="customerName"
                {...register('customerName')}
                placeholder="John Doe"
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">
                  {errors.customerName.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                {...register('customerEmail')}
                placeholder="john@example.com"
              />
              {errors.customerEmail && (
                <p className="text-sm text-destructive">
                  {errors.customerEmail.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <textarea
                id="notes"
                {...register('notes')}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Any special requirements or questions..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Quote Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

