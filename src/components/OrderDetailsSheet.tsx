import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { GlassCard } from '@/components/GlassCard'
import { Badge } from '@/components/ui/badge'
import { formatPrice } from '@/lib/utils'

interface Order {
  id: number
  order_number: number
  user_id: string
  company_name: string
  email: string
  phone: string | null
  notes: string | null
  items: Array<{
    product_id: string
    product_name: string
    sku: string
    quantity: number
    unit_price: number
    total: number
  }>
  total: number
  status: 'new' | 'pending' | 'approved' | 'rejected' | 'expired'
  created_at: string
  updated_at: string
}

interface OrderDetailsSheetProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

function getStatusBadge(status: Order['status']) {
  const statusConfig = {
    new: { label: 'Waiting for confirmation', variant: 'outline' as const, className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50' },
    pending: { label: 'Waiting for confirmation', variant: 'outline' as const, className: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/50' },
    approved: { label: 'Confirmed', variant: 'outline' as const, className: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/50' },
    rejected: { label: 'Rejected', variant: 'outline' as const, className: 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50' },
    expired: { label: 'Expired', variant: 'outline' as const, className: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/50' },
  }
  const config = statusConfig[status] || statusConfig.new
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
}: OrderDetailsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Order #{order.order_number || order.id}</span>
            {getStatusBadge(order.status)}
          </SheetTitle>
          <SheetDescription>
            {formatDate(order.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Customer Info */}
          <GlassCard className="p-4">
            <h3 className="font-semibold mb-3">Customer Information</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Company:</span>{' '}
                <span className="font-medium">{order.company_name}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>{' '}
                <span className="font-medium">{order.email}</span>
              </div>
              {order.phone && (
                <div>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  <span className="font-medium">{order.phone}</span>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Order Items */}
          <GlassCard className="p-4">
            <h3 className="font-semibold mb-4">Order Items</h3>
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 p-3 rounded-lg border border-border/50 bg-card/50"
                >
                  <div className="flex-shrink-0 w-16 h-16 rounded bg-muted flex items-center justify-center">
                    <span className="text-2xl">📦</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm line-clamp-1">
                      {item.product_name}
                    </h4>
                    <p className="text-xs text-muted-foreground font-mono">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-sm text-muted-foreground">
                      {item.quantity} × {formatPrice(item.unit_price)}
                    </div>
                    <div className="font-bold">
                      {formatPrice(item.total)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Totals */}
          <GlassCard className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(order.total)}</span>
              </div>
              <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                <span className="font-bold text-lg">Grand Total</span>
                <span className="font-bold text-xl text-primary">
                  {formatPrice(order.total)}
                </span>
              </div>
            </div>
          </GlassCard>

          {/* Notes */}
          {order.notes && (
            <GlassCard className="p-4">
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.notes}
              </p>
            </GlassCard>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

