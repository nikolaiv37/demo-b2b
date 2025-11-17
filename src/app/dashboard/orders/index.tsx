import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { OrderDetailsSheet } from '@/components/OrderDetailsSheet'
import { useAuth } from '@/hooks/useAuth'
import { Package, ShoppingCart, Eye } from 'lucide-react'
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

export function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const devUserId = isDevMode ? 'dev-user-123' : null
  const userId = user?.id || devUserId

  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as Order[]
    },
    enabled: !!userId,
  })

  // Auto-scroll to new order if coming from order submission
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const newOrderId = urlParams.get('newOrder')
    if (newOrderId && orders && orders.length > 0) {
      const newOrder = orders.find((o) => o.id.toString() === newOrderId)
      if (newOrder) {
        // Open details sheet for new order
        setSelectedOrder(newOrder)
        setDetailsOpen(true)
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/orders')
      }
    }
  }, [orders])

  const itemsCount = (order: Order) => {
    return order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Orders</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>
        <GlassCard>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Orders</h1>
          <p className="text-muted-foreground">View and manage your orders</p>
        </div>
      </div>

      {orders && orders.length > 0 ? (
        <>
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <GlassCard>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left p-4 font-semibold">Order No.</th>
                      <th className="text-left p-4 font-semibold">Date</th>
                      <th className="text-left p-4 font-semibold">Items</th>
                      <th className="text-left p-4 font-semibold">Total</th>
                      <th className="text-left p-4 font-semibold">Status</th>
                      <th className="text-right p-4 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-border/30 hover:bg-white/5 dark:hover:bg-black/5 transition-colors"
                      >
                        <td className="p-4">
                          <span className="font-mono font-semibold text-primary">
                            #{order.order_number || order.id}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-muted-foreground">
                          {formatDate(order.created_at)}
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{itemsCount(order)} items</span>
                        </td>
                        <td className="p-4 font-semibold">
                          {formatPrice(order.total)}
                        </td>
                        <td className="p-4">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="p-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedOrder(order)
                              setDetailsOpen(true)
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          {/* Mobile Card View */}
          <div className="lg:hidden space-y-4">
            {orders.map((order) => (
              <GlassCard
                key={order.id}
                className="p-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-mono font-semibold text-lg text-primary">
                        #{order.order_number || order.id}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(order.created_at)}
                      </p>
                    </div>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    <div>
                      <p className="text-sm text-muted-foreground">Items</p>
                      <p className="font-semibold">{itemsCount(order)} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="font-semibold text-lg">{formatPrice(order.total)}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSelectedOrder(order)
                      setDetailsOpen(true)
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </>
      ) : (
        <GlassCard className="text-center py-16">
          <Package className="w-20 h-20 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No orders yet</h3>
          <p className="text-muted-foreground mb-6">
            Start shopping to place your first order
          </p>
          <Button onClick={() => navigate('/dashboard/products')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            Start Shopping
          </Button>
        </GlassCard>
      )}

      {/* Order Details Sheet */}
      {selectedOrder && (
        <OrderDetailsSheet
          order={selectedOrder}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}
    </div>
  )
}
