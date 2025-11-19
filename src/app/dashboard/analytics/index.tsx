// This is the page owners open every morning with their coffee ☕
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { formatPrice, formatCurrency } from '@/lib/utils'
import {
  DollarSign,
  ShoppingCart,
  AlertCircle,
  TrendingUp,
  Users,
  Download,
  Package,
  BarChart3,
} from 'lucide-react'
import { CSVLink } from 'react-csv'

type DateRange = 'last30' | 'thisMonth' | 'lastMonth'

interface AnalyticsData {
  totalRevenue: number
  ordersCount: number
  awaitingPayment: {
    amount: number
    count: number
  }
  averageOrderValue: number
  newBuyersThisMonth: number
  revenueOverTime: Array<{ date: string; revenue: number }>
  ordersOverTime: Array<{ date: string; orders: number }>
  topProducts: Array<{
    sku: string
    name: string
    revenue: number
    quantity: number
  }>
  topBuyers: Array<{
    email: string
    name: string
    revenue: number
    orders: number
  }>
  lowStockProducts: Array<{
    id: number
    sku: string
    name: string
    stock: number
  }>
  recentOrders: Array<{
    id: string
    order_number?: number
    customer_name?: string
    customer_email: string
    total: number
    status: string
    created_at: string
  }>
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#84cc16', '#f97316', '#6366f1']

export function AnalyticsPage() {
  const { company } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>('last30')

  // Calculate date range
  const dateRangeConfig = useMemo(() => {
    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (dateRange) {
      case 'last30':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'thisMonth':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'lastMonth':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        endDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
    }

    return {
      start: startDate.toISOString(),
      end: endDate.toISOString(),
    }
  }, [dateRange])

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', company?.id, dateRange],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!company?.id) {
        throw new Error('Company not found')
      }

      const { start, end } = dateRangeConfig

      // Try to fetch from orders table first, fallback to quotes
      let orders: any[] = []
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .eq('company_id', company.id)
        .gte('created_at', start)
        .lte('created_at', end)
        .order('created_at', { ascending: false })

      if (!ordersError && ordersData) {
        orders = ordersData
      } else {
        // Fallback to quotes if orders table doesn't exist or has no data
        let quotesQuery = supabase
          .from('quotes')
          .select('*')
          .gte('created_at', start)
          .lte('created_at', end)
        
        // Filter by company_id if the column exists
        try {
          quotesQuery = quotesQuery.eq('company_id', company.id)
        } catch (e) {
          // company_id column might not exist, continue without filter
        }
        
        const { data: quotes, error: quotesError } = await quotesQuery.order('created_at', { ascending: false })

        if (!quotesError && quotes) {
          // Transform quotes to orders format
          orders = quotes.map((q: any) => ({
            id: q.id,
            order_number: q.order_number || q.id,
            company_id: q.company_id || company.id,
            customer_email: q.email || q.customer_email || '',
            customer_name: q.company_name || q.customer_name || '',
            total: parseFloat(q.total) || 0,
            status: q.status === 'approved' ? 'paid' : 'pending',
            payment_status: q.status === 'approved' ? 'paid' : 'pending',
            created_at: q.created_at,
            items: q.items || [],
          }))
        }
      }

      return calculateAnalytics(orders, company.id, start, end)
    },
    enabled: !!company?.id,
  })

  // Helper function to calculate analytics
  async function calculateAnalytics(
    orders: any[],
    companyId: string,
    start: string,
    end: string
  ): Promise<AnalyticsData> {
    // Calculate metrics
    const paidOrders = orders.filter(
      (o) => o.payment_status === 'paid' || o.status === 'paid'
    )
    const totalRevenue = paidOrders.reduce(
      (sum, o) => sum + parseFloat(o.total || 0),
      0
    )
    const ordersCount = orders.length
    const awaitingPaymentOrders = orders.filter(
      (o) => o.payment_status === 'pending' || o.status === 'pending'
    )
    const awaitingPayment = {
      amount: awaitingPaymentOrders.reduce(
        (sum, o) => sum + parseFloat(o.total || 0),
        0
      ),
      count: awaitingPaymentOrders.length,
    }
    const averageOrderValue =
      paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0

    // Get unique buyers this month
    const thisMonthStart = new Date()
    thisMonthStart.setDate(1)
    const thisMonthOrders = orders.filter(
      (o) => new Date(o.created_at) >= thisMonthStart
    )
    const uniqueBuyersThisMonth = new Set(
      thisMonthOrders.map((o) => o.customer_email || o.email).filter(Boolean)
    ).size

    // Revenue over time
    const revenueByDate = new Map<string, number>()
    paidOrders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      revenueByDate.set(
        date,
        (revenueByDate.get(date) || 0) + parseFloat(order.total || 0)
      )
    })
    const revenueOverTime = Array.from(revenueByDate.entries())
      .map(([date, revenue]) => ({
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Orders over time
    const ordersByDate = new Map<string, number>()
    orders.forEach((order) => {
      const date = new Date(order.created_at).toISOString().split('T')[0]
      ordersByDate.set(date, (ordersByDate.get(date) || 0) + 1)
    })
    const ordersOverTime = Array.from(ordersByDate.entries())
      .map(([date, orders]) => ({
        date: new Date(date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        orders,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Top products by revenue
    const productRevenue = new Map<
      string,
      { sku: string; name: string; revenue: number; quantity: number }
    >()
    paidOrders.forEach((order) => {
      const items = order.items || []
      items.forEach((item: any) => {
        const sku = item.sku || 'UNKNOWN'
        const existing = productRevenue.get(sku)
        const revenue = parseFloat(item.total || item.unit_price * item.quantity || 0)
        const quantity = parseInt(item.quantity || 0)
        if (existing) {
          existing.revenue += revenue
          existing.quantity += quantity
        } else {
          productRevenue.set(sku, {
            sku,
            name: item.product_name || item.name || sku,
            revenue,
            quantity,
          })
        }
      })
    })
    const topProducts = Array.from(productRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Top buyers by revenue
    const buyerRevenue = new Map<
      string,
      { email: string; name: string; revenue: number; orders: number }
    >()
    paidOrders.forEach((order) => {
      const email = order.customer_email || order.email || 'unknown'
      const name = order.customer_name || order.company_name || 'Unknown'
      const existing = buyerRevenue.get(email)
      const revenue = parseFloat(order.total || 0)
      if (existing) {
        existing.revenue += revenue
        existing.orders += 1
      } else {
        buyerRevenue.set(email, {
          email,
          name,
          revenue,
          orders: 1,
        })
      }
    })
    const topBuyers = Array.from(buyerRevenue.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // Low stock products (< 10 pcs)
    const { data: products } = await supabase
      .from('products')
      .select('id, sku, name, quantity, stock')
      .or('quantity.lt.10,stock.lt.10')
      .limit(20)

    const lowStockProducts = (products || []).map((p: any) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      stock: p.stock ?? p.quantity ?? 0,
    }))

    // Recent orders (last 10)
    const recentOrders = orders
      .slice(0, 10)
      .map((o) => ({
        id: o.id,
        order_number: o.order_number || o.id,
        customer_name: o.customer_name || o.company_name || 'Unknown',
        customer_email: o.customer_email || o.email || '',
        total: parseFloat(o.total || 0),
        status: o.status || o.payment_status || 'pending',
        created_at: o.created_at,
      }))

    return {
      totalRevenue,
      ordersCount,
      awaitingPayment,
      averageOrderValue,
      newBuyersThisMonth: uniqueBuyersThisMonth,
      revenueOverTime,
      ordersOverTime,
      topProducts,
      topBuyers,
      lowStockProducts,
      recentOrders,
    }
  }

  // CSV export data
  const revenueCSVData = useMemo(() => {
    if (!analytics) return []
    return analytics.revenueOverTime.map((item) => ({
      Date: item.date,
      Revenue: item.revenue.toFixed(2),
    }))
  }, [analytics])

  const topProductsCSVData = useMemo(() => {
    if (!analytics) return []
    return analytics.topProducts.map((product) => ({
      SKU: product.sku,
      'Product Name': product.name,
      Revenue: product.revenue.toFixed(2),
      'Quantity Sold': product.quantity,
    }))
  }, [analytics])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-12 w-12 mb-4" />
              <Skeleton className="h-6 w-24 mb-2" />
              <Skeleton className="h-4 w-32" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <GlassCard>
        <div className="text-center py-16">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">No data available</h3>
          <p className="text-muted-foreground">
            Analytics will appear here once you have orders and products.
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics & Insights</h1>
          <p className="text-muted-foreground">
            Track your business performance and make data-driven decisions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last30">Last 30 days</SelectItem>
              <SelectItem value="thisMonth">This month</SelectItem>
              <SelectItem value="lastMonth">Last month</SelectItem>
            </SelectContent>
          </Select>
          <CSVLink data={revenueCSVData} filename="revenue-export.csv">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Revenue CSV
            </Button>
          </CSVLink>
          <CSVLink data={topProductsCSVData} filename="top-products-export.csv">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export Top Products CSV
            </Button>
          </CSVLink>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(analytics.totalRevenue)}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Orders This Period</p>
            <p className="text-2xl font-bold">{analytics.ordersCount}</p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Awaiting Payment</p>
            <p className="text-2xl font-bold">
              {formatCurrency(analytics.awaitingPayment.amount)}
            </p>
            <p className="text-xs text-muted-foreground">
              {analytics.awaitingPayment.count} orders
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Order Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(analytics.averageOrderValue)}
            </p>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
              <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">New Buyers This Month</p>
            <p className="text-2xl font-bold">{analytics.newBuyersThisMonth}</p>
          </div>
        </GlassCard>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
          {analytics.revenueOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analytics.revenueOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
                  className="text-xs"
                  stroke="currentColor"
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No revenue data for this period
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Orders Over Time</h3>
          {analytics.ordersOverTime.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.ordersOverTime}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  stroke="currentColor"
                />
                <YAxis
                  className="text-xs"
                  stroke="currentColor"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="orders" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No orders data for this period
            </div>
          )}
        </GlassCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Best-Selling Products</h3>
          {analytics.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.topProducts}
                layout="vertical"
                margin={{ left: 60, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  type="number"
                  className="text-xs"
                  stroke="currentColor"
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  className="text-xs"
                  stroke="currentColor"
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No product sales data for this period
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 10 Buyers by Revenue</h3>
          {analytics.topBuyers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={analytics.topBuyers}
                layout="vertical"
                margin={{ left: 60, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                <XAxis
                  type="number"
                  className="text-xs"
                  stroke="currentColor"
                  tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  className="text-xs"
                  stroke="currentColor"
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#ec4899" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No buyer data for this period
            </div>
          )}
        </GlassCard>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Low Stock Alerts</h3>
            <Badge variant="destructive">
              {analytics.lowStockProducts.length} items
            </Badge>
          </div>
          {analytics.lowStockProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead>Current Stock</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>
                        <Badge variant={product.stock < 5 ? 'destructive' : 'secondary'}>
                          {product.stock} pcs
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Navigate to products page with filter
                            window.location.href = `/dashboard/products?sku=${product.sku}`
                          }}
                        >
                          Restock
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">All products are well stocked!</p>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Orders</h3>
            <Badge variant="secondary">{analytics.recentOrders.length} orders</Badge>
          </div>
          {analytics.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.recentOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono">
                        #{order.order_number || order.id}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{order.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {order.customer_email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(order.total)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            order.status === 'paid'
                              ? 'default'
                              : order.status === 'pending'
                              ? 'secondary'
                              : 'outline'
                          }
                        >
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(order.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No recent orders</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  )
}

