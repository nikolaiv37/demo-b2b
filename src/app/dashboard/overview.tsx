import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseClient'
import { GlassCard } from '@/components/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatCurrency, formatPrice, calculatePercentageChange } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Plus,
  Upload,
  Store,
  AlertTriangle,
} from 'lucide-react'
import { trackEvent, AnalyticsEvents } from '@/lib/analytics'
import { useEffect, useMemo } from 'react'
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface DashboardStats {
  totalRevenue: number
  thisMonthRevenue: number
  lastMonthRevenue: number
  totalOrders: number
  thisMonthOrders: number
  lastMonthOrders: number
  activeCustomers: number
  totalProducts: number
  lowStockCount: number
  revenueByDay: Array<{ date: string; revenue: number }>
  ordersByDay: Array<{ date: string; orders: number }>
  categoriesByRevenue: Array<{ name: string; value: number; revenue: number }>
  recentOrders: Array<{
    id: string
    order_number?: number
    customer_name?: string
    customer_email: string
    total: number
    status: string
    created_at: string
  }>
  lowStockProducts: Array<{
    id: string
    sku: string
    name: string
    stock: number
    category?: string
  }>
}

const COLORS = [
  'hsl(var(--primary))',
  '#8b5cf6',
  '#ec4899',
  '#f59e0b',
  '#10b981',
  '#3b82f6',
]

export function DashboardOverview() {
  const { company } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    trackEvent(AnalyticsEvents.DASHBOARD_VIEWED)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', company?.id],
    queryFn: async () => {
      if (!company?.id) return null

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Fetch all quotes (treating them as orders since orders table doesn't exist)
      // Show all statuses: 'new', 'pending', 'approved' - treating approved as paid, others as pending
      // Using the actual quotes schema: user_id, company_name, email, status
      const { data: allOrders } = await supabase
        .from('quotes')
        .select('total, created_at, user_id, items, status, id, order_number, company_name, email')
        .in('status', ['new', 'pending', 'approved'])

      // Fetch this month's quotes
      const { data: thisMonthOrders } = await supabase
        .from('quotes')
        .select('total, created_at, items, status')
        .in('status', ['new', 'pending', 'approved'])
        .gte('created_at', startOfMonth.toISOString())

      // Fetch last month's quotes
      const { data: lastMonthOrders } = await supabase
        .from('quotes')
        .select('total, created_at, status')
        .in('status', ['new', 'pending', 'approved'])
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())

      // Fetch quotes for last 30 days (for daily breakdown)
      const { data: recentOrdersData } = await supabase
        .from('quotes')
        .select('total, created_at, items, company_name, email, status, id, order_number')
        .in('status', ['new', 'pending', 'approved'])
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(5)

      // Fetch products - use quantity (not stock), and weboffer_price (not wholesale_price)
      let productsQuery = supabase
        .from('products')
        .select('id, sku, name, quantity, category, weboffer_price')
      
      // Try to filter by company_id, if that fails, get all products
      const { data: products, error: productsError } = await productsQuery
      
      // Filter products by company_id if column exists, otherwise show all
      let filteredProducts = products || []
      if (products && !productsError) {
        // Check if products have company_id field and filter
        if (products.length > 0 && 'company_id' in products[0]) {
          filteredProducts = products.filter((p: any) => p.company_id === company.id)
        } else {
          // No company_id field, show all products (RLS will handle filtering)
          filteredProducts = products
        }
      }
      
      // Normalize quantity field
      filteredProducts = filteredProducts.map((p: any) => ({
        ...p,
        quantity: p.quantity ?? 0,
      }))

      // Calculate stats
      // For revenue, only count approved quotes (treating them as paid orders)
      const approvedOrders = allOrders?.filter((o: any) => o.status === 'approved') || []
      const totalRevenue = approvedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      const thisMonthApproved = thisMonthOrders?.filter((o: any) => o.status === 'approved') || []
      const thisMonthRevenue = thisMonthApproved.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      const lastMonthApproved = lastMonthOrders?.filter((o: any) => o.status === 'approved') || []
      const lastMonthRevenue = lastMonthApproved.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      // For order counts, show all quotes (new, pending, approved)
      const totalOrders = allOrders?.length || 0
      const thisMonthOrdersCount = thisMonthOrders?.length || 0
      const lastMonthOrdersCount = lastMonthOrders?.length || 0

      // Active customers (unique user_ids or emails from quotes)
      const uniqueCustomers = new Set(
        allOrders?.map((o: any) => o.user_id || o.email).filter(Boolean) || []
      )
      const activeCustomers = uniqueCustomers.size

      // Products stats
      const totalProducts = filteredProducts?.length || 0
      const lowStockProducts = filteredProducts?.filter((p) => (p.quantity || 0) < 10) || []
      const lowStockCount = lowStockProducts.length

      // Revenue by day (this month) - only count approved quotes
      const revenueByDayMap = new Map<string, number>()
      thisMonthApproved?.forEach((order) => {
        const date = new Date(order.created_at).toISOString().split('T')[0]
        revenueByDayMap.set(date, (revenueByDayMap.get(date) || 0) + Number(order.total || 0))
      })
      const revenueByDay = Array.from(revenueByDayMap.entries())
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          revenue: item.revenue,
        }))

      // Orders by day (last 30 days) - count all quotes
      const ordersByDayMap = new Map<string, number>()
      allOrders?.forEach((order: any) => {
        const orderDate = new Date(order.created_at)
        if (orderDate >= thirtyDaysAgo) {
          const date = orderDate.toISOString().split('T')[0]
          ordersByDayMap.set(date, (ordersByDayMap.get(date) || 0) + 1)
        }
      })
      const ordersByDay = Array.from(ordersByDayMap.entries())
        .map(([date, orders]) => ({ date, orders }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item) => ({
          date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          orders: item.orders,
        }))

      // Categories by revenue (from order items) - only count approved quotes
      const categoryRevenueMap = new Map<string, number>()
      approvedOrders?.forEach((order: any) => {
        const items = order.items as Array<{ product_id?: string; category?: string; total: number }>
        items?.forEach((item) => {
          // Try to get category from product
          const product = filteredProducts?.find((p) => p.id === item.product_id)
          const category = product?.category || item.category || 'Uncategorized'
          categoryRevenueMap.set(category, (categoryRevenueMap.get(category) || 0) + Number(item.total || 0))
        })
      })
      const categoriesByRevenue = Array.from(categoryRevenueMap.entries())
        .map(([name, revenue]) => ({ name, value: revenue, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      // Recent orders (from quotes table)
      const recentOrders = (recentOrdersData || []).map((order: any) => ({
        id: order.id,
        order_number: order.order_number || order.id.slice(0, 8).toUpperCase(),
        customer_name: order.company_name || 'Unknown',
        customer_email: order.email || '',
        total: Number(order.total || 0),
        status: order.status,
        created_at: order.created_at,
      }))

      // Low stock products
      const lowStock = lowStockProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.quantity || 0,
        category: p.category,
      }))

      return {
        totalRevenue,
        thisMonthRevenue,
        lastMonthRevenue,
        totalOrders,
        thisMonthOrders: thisMonthOrdersCount,
        lastMonthOrders: lastMonthOrdersCount,
        activeCustomers,
        totalProducts,
        lowStockCount,
        revenueByDay,
        ordersByDay,
        categoriesByRevenue,
        recentOrders,
        lowStockProducts: lowStock,
      } as DashboardStats
    },
    enabled: !!company?.id,
  })

  const revenueChange = useMemo(() => {
    if (!stats) return 0
    return calculatePercentageChange(stats.thisMonthRevenue, stats.lastMonthRevenue)
  }, [stats])

  const ordersChange = useMemo(() => {
    if (!stats) return 0
    return calculatePercentageChange(stats.thisMonthOrders, stats.lastMonthOrders)
  }, [stats])

  // Sparkline data for revenue (last 7 days of revenueByDay)
  const revenueSparkline = useMemo(() => {
    if (!stats?.revenueByDay || stats.revenueByDay.length === 0) return []
    const last7Days = stats.revenueByDay.slice(-7)
    // Ensure we have at least 2 data points for the chart
    if (last7Days.length < 2) {
      return [0, ...last7Days.map((d) => d.revenue)]
    }
    return last7Days.map((d) => d.revenue)
  }, [stats])

  const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color,
    change,
    sparkline,
  }: {
    title: string
    value: string
    subtitle?: string
    icon: any
    color: string
    change?: number
    sparkline?: number[]
  }) => (
    <GlassCard hover className="relative overflow-hidden">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          {isLoading ? (
            <Skeleton className="h-10 w-32 mb-2" />
          ) : (
            <p className="text-3xl font-bold mb-1">{value}</p>
          )}
          {subtitle && (
            <p className="text-sm text-muted-foreground mb-2">{subtitle}</p>
          )}
          {change !== undefined && !isLoading && (
            <div className="flex items-center gap-1 mt-2">
              {change > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span
                className={`text-sm font-semibold ${
                  change > 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {change > 0 ? '+' : ''}
                {change.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground ml-1">vs last month</span>
            </div>
          )}
          {sparkline && sparkline.length > 0 && (
            <div className="mt-3 h-12 w-full opacity-60">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={sparkline.map((v, i) => ({ value: v, index: i }))}
                  margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                >
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    fill={color}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-lg bg-white/10 dark:bg-black/10`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </GlassCard>
  )

  return (
    <div className="space-y-8 pb-24 md:pb-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Command Center
        </h1>
        <p className="text-muted-foreground">
          Real-time insights into your furniture business
        </p>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={stats ? formatCurrency(stats.totalRevenue, 'EUR') : '—'}
          subtitle={stats ? `€${stats.thisMonthRevenue.toFixed(2)} this month` : undefined}
          icon={DollarSign}
          color="text-green-500"
          change={revenueChange}
          sparkline={revenueSparkline}
        />
        <StatCard
          title="Total Orders"
          value={stats?.totalOrders.toString() || '—'}
          subtitle={stats ? `${stats.thisMonthOrders} this month` : undefined}
          icon={ShoppingCart}
          color="text-blue-500"
          change={ordersChange}
        />
        <StatCard
          title="Active Customers"
          value={stats?.activeCustomers.toString() || '—'}
          subtitle="Placed orders"
          icon={Users}
          color="text-purple-500"
        />
        <StatCard
          title="Products in Catalog"
          value={stats?.totalProducts.toString() || '—'}
          subtitle={
            stats && stats.lowStockCount > 0
              ? `${stats.lowStockCount} low stock`
              : 'All stocked'
          }
          icon={Package}
          color={stats && stats.lowStockCount > 0 ? 'text-red-500' : 'text-amber-500'}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Revenue This Month</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : stats?.revenueByDay && stats.revenueByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={stats.revenueByDay}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `€${value.toFixed(0)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                  }}
                  formatter={(value: number) => formatCurrency(value, 'EUR')}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No revenue data this month
            </div>
          )}
        </GlassCard>

        {/* Orders Chart */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Orders (Last 30 Days)</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : stats?.ordersByDay && stats.ordersByDay.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.ordersByDay}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fill: 'currentColor', fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Bar dataKey="orders" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No orders in the last 30 days
            </div>
          )}
        </GlassCard>
      </div>

      {/* Categories Pie Chart */}
      {stats?.categoriesByRevenue && stats.categoriesByRevenue.length > 0 && (
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Top Categories by Revenue</h2>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={stats.categoriesByRevenue}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stats.categoriesByRevenue.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(10px)',
                    }}
                    formatter={(value: number) => formatCurrency(value, 'EUR')}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col justify-center space-y-3">
                {stats.categoriesByRevenue.map((cat, index) => (
                  <div key={cat.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(cat.revenue, 'EUR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Recent Orders & Low Stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard/orders')}
            >
              View all
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-semibold text-sm">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                      <OrderStatusBadge status={order.status as any} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.customer_name || order.customer_email}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(order.total, 'EUR')}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No recent orders
            </div>
          )}
        </GlassCard>

        {/* Low Stock Alert */}
        <GlassCard className={stats && stats.lowStockCount > 0 ? 'border-red-500/30' : ''}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle
              className={`w-5 h-5 ${
                stats && stats.lowStockCount > 0 ? 'text-red-500' : 'text-muted-foreground'
              }`}
            />
            <h2 className="text-xl font-semibold">Low Stock Alert</h2>
          </div>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : stats && stats.lowStockProducts.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
              {stats.lowStockProducts.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">SKU: {product.sku}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/50">
                      {product.stock} left
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/dashboard/products')}
                    >
                      Restock
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>All products have sufficient stock</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick Actions Bar - Mobile Floating */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-50">
        <GlassCard className="p-2">
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar">
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => navigate('/dashboard/products')}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Product
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => navigate('/dashboard/csv-import')}
            >
              <Upload className="w-4 h-4 mr-1" />
              CSV Import
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-shrink-0"
              onClick={() => navigate('/catalog')}
            >
              <Store className="w-4 h-4 mr-1" />
              Catalog
            </Button>
          </div>
        </GlassCard>
      </div>

      {/* Quick Actions - Desktop */}
      <div className="hidden md:block">
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/dashboard/products')}
            >
              <Plus className="w-5 h-5" />
              <span>Add Product</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/dashboard/csv-import')}
            >
              <Upload className="w-5 h-5" />
              <span>CSV Import</span>
            </Button>
            <Button
              variant="outline"
              className="h-20 flex-col gap-2"
              onClick={() => navigate('/catalog')}
            >
              <Store className="w-5 h-5" />
              <span>Go to Catalog</span>
            </Button>
          </div>
        </GlassCard>
      </div>
    </div>
  )
}
