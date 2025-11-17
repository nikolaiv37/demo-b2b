import { Badge } from '@/components/ui/badge'
import { OrderStatus, QuoteStatus } from '@/types'
import { cn } from '@/lib/utils'

interface OrderStatusBadgeProps {
  status: OrderStatus | QuoteStatus
  className?: string
}

export function OrderStatusBadge({ status, className }: OrderStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pending',
          className: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
        }
      case 'approved':
        return {
          label: 'Approved',
          className: 'bg-green-500/20 text-green-700 dark:text-green-300',
        }
      case 'rejected':
        return {
          label: 'Rejected',
          className: 'bg-red-500/20 text-red-700 dark:text-red-300',
        }
      case 'expired':
        return {
          label: 'Expired',
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
        }
      case 'processing':
        return {
          label: 'Processing',
          className: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
        }
      case 'shipped':
        return {
          label: 'Shipped',
          className: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
        }
      case 'delivered':
        return {
          label: 'Delivered',
          className: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        }
      case 'cancelled':
        return {
          label: 'Cancelled',
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
        }
      default:
        return {
          label: status,
          className: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
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

