import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { GlassCard } from '@/components/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  DollarSign,
  ShoppingCart,
  FileText,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import { DashboardStats } from '@/types'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { useEffect } from 'react'

export function DashboardOverview() {
  const { company } = useAuth()

  useEffect(() => {
    trackEvent(AnalyticsEvents.DASHBOARD_VIEWED)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      // Fetch orders
      const { data: orders } = await supabase
        .from('orders')
        .select('total, created_at')
        .eq('company_id', company.id)
        .eq('payment_status', 'paid')

      // Fetch pending quotes
      const { data: quotes } = await supabase
        .from('quotes')
        .select('id')
        .eq('company_id', company.id)
        .eq('status', 'pending')

      // Fetch low stock products
      const { data: lowStock } = await supabase
        .from('products')
        .select('id')
        .eq('company_id', company.id)
        .lt('stock', 10)

      const totalRevenue = orders?.reduce((sum, order) => sum + order.total, 0) || 0
      const totalOrders = orders?.length || 0
      const pendingQuotes = quotes?.length || 0
      const lowStockProducts = lowStock?.length || 0

      return {
        total_revenue: totalRevenue,
        total_orders: totalOrders,
        pending_quotes: pendingQuotes,
        low_stock_products: lowStockProducts,
        revenue_change: 12.5, // Mock data
        orders_change: 8.2, // Mock data
      } as DashboardStats
    },
    enabled: !!company?.id,
  })

  const statCards = [
    {
      title: 'Total Revenue',
      value: stats ? formatCurrency(stats.total_revenue) : '—',
      change: stats?.revenue_change,
      icon: DollarSign,
      color: 'text-green-500',
    },
    {
      title: 'Total Orders',
      value: stats?.total_orders.toString() || '—',
      change: stats?.orders_change,
      icon: ShoppingCart,
      color: 'text-blue-500',
    },
    {
      title: 'Pending Quotes',
      value: stats?.pending_quotes.toString() || '—',
      icon: FileText,
      color: 'text-yellow-500',
    },
    {
      title: 'Low Stock Items',
      value: stats?.low_stock_products.toString() || '—',
      icon: AlertTriangle,
      color: 'text-red-500',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's what's happening with your business.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <GlassCard key={index} hover>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {stat.title}
                </p>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-3xl font-bold">{stat.value}</p>
                )}
                {stat.change && (
                  <div className="flex items-center gap-1 mt-2">
                    {stat.change > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        stat.change > 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {stat.change > 0 ? '+' : ''}
                      {stat.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg bg-white/10 dark:bg-black/10`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Recent Quotes</h2>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                No recent quotes
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Low Stock Alert</h2>
          <div className="space-y-3">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : stats && stats.low_stock_products > 0 ? (
              <div className="flex items-center gap-3 p-3 glass-card">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                <div>
                  <p className="font-semibold">
                    {stats.low_stock_products} products
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Running low on stock
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                All products have sufficient stock
              </p>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  )
}

