import { Badge } from '@/components/ui/badge'
import { OrderStatus, QuoteStatus } from '@/types'
import { cn } from '@/lib/utils'

interface OrderStatusBadgeProps {
  status: OrderStatus | QuoteStatus | string
  className?: string
}

// Map legacy database status values to new UI statuses
function mapLegacyStatus(status: string): string {
  const legacyMap: Record<string, string> = {
    // Old DB values -> New UI values
    new: 'processing',
    draft: 'processing',
    pending: 'awaiting_payment',
    awaiting_payment: 'awaiting_payment',
    approved: 'completed',
    paid: 'completed',
    delivered: 'completed',
    completed: 'completed',
    shipped: 'shipped',
    processing: 'processing',
    // Keep rejected/expired for quotes
    rejected: 'rejected',
    expired: 'expired',
    cancelled: 'cancelled',
  }
  return legacyMap[status] || status
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  // Map legacy status to new status for display
  const mappedStatus = mapLegacyStatus(status)

  const getStatusConfig = () => {
    switch (mappedStatus) {
      // New workflow statuses
      case 'processing':
        return {
          label: 'Processing',
          className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
        }
      case 'awaiting_payment':
        return {
          label: 'Awaiting Payment',
          className: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
        }
      case 'shipped':
        return {
          label: 'Shipped',
          className: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
        }
      case 'completed':
        return {
          label: 'Completed & Sent',
          className: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
        }
      // Legacy statuses for backwards compatibility
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
        }
      case 'expired':
        return {
          label: 'Expired',
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
        }
      default:
        return {
          label: status,
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
        }
    }
  }

  const config = getStatusConfig()

  return (
    <Badge
      variant="outline"
      className={cn('font-semibold', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
