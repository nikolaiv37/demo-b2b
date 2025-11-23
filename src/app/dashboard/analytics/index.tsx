// This is the page owners open every morning with their coffee ☕
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
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
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { formatCurrency, calculatePercentageChange } from '@/lib/utils'
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Package,
  BarChart3,
  AlertTriangle,
  FileText,
  CheckCircle,
  Send,
} from 'lucide-react'

type DateRange = 'last30' | 'last90' | 'alltime'

interface AnalyticsData {
  // Metrics
  totalRevenue: number
  totalRevenueMoM: number // Month-over-month % change
  totalOrders: number
  averageOrderValue: number
  quotesToOrdersConversion: number // Last 30 days conversion rate (admin only)
  
  // Charts
  revenueOverTime: Array<{ month: string; revenue: number }>
  
  // Top Products
  topProducts: Array<{
    sku: string
    name: string
    revenue: number
    quantity: number
  }>
  
  // Top Customers (admin only)
  topCustomers: Array<{
    companyName: string
    totalSpent: number
    ordersCount: number
    lastOrderDate: string
  }>
  
  // Low Stock
  lowStockProducts: Array<{
    id: string
    sku: string
    name: string
    stock: number
  }>
  
  // Quote Funnel (last 30 days, admin only)
  quoteFunnel: {
    draft: number
    sent: number
    accepted: number
    ordered: number
  }
  
  // Company user specific data
  myQuotesStatus?: {
    pending: number
    approved: number
    rejected: number
    expired: number
  }
  myRecentQuotes?: Array<{
    id: string
    order_number?: number
    total: number
    status: string
    created_at: string
  }>
  myOrderStatus?: {
    pending: number
    approved: number
    processing: number
    shipped: number
    delivered: number
  }
  myPendingQuotesCount?: number
}

export function AnalyticsPage() {
  const { user, profile, isAdmin } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>('alltime')
  
  // Debug logging
  console.log('AnalyticsPage render:', {
    userId: user?.id,
    profileId: profile?.id,
    profileCompanyId: (profile as any)?.company_id,
    isAdmin,
  })

  // Calculate date range
  const dateRangeConfig = useMemo(() => {
    const now = new Date()
    let startDate: Date | null = null

    switch (dateRange) {
      case 'last30':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 30)
        break
      case 'last90':
        startDate = new Date(now)
        startDate.setDate(startDate.getDate() - 90)
        break
      case 'alltime':
        startDate = null // No filter
        break
    }

    return {
      start: startDate?.toISOString() || null,
      end: now.toISOString(),
    }
  }, [dateRange])

  // Get company ID from profile or fetch it
  const companyId = useMemo(() => {
    // Try to get company_id from profile
    const profileCompanyId = (profile as any)?.company_id
    if (profileCompanyId) {
      console.log('Using company_id from profile:', profileCompanyId)
      return profileCompanyId
    }
    // For admin, we might not need company_id (they see all data)
    if (isAdmin) {
      console.log('Admin user - will fetch all data')
      return null
    }
    // If no company_id, we'll use user.id and rely on RLS
    console.log('No company_id found, will use user.id:', user?.id)
    return user?.id || null
  }, [profile, user, isAdmin])

  // Fetch all analytics data in parallel
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['analytics', companyId, dateRange, user?.id],
    queryFn: async (): Promise<AnalyticsData> => {
      console.log('Analytics queryFn called with:', { companyId, dateRange, userId: user?.id })
      
      try {
        // For admin or if no company_id, we'll fetch all data (RLS will handle filtering)
        if (!user?.id && !isAdmin) {
          console.warn('No user ID available, returning empty analytics')
          return {
            totalRevenue: 0,
            totalRevenueMoM: 0,
            totalOrders: 0,
            averageOrderValue: 0,
            quotesToOrdersConversion: 0,
            revenueOverTime: [],
            topProducts: [],
            topCustomers: [],
            lowStockProducts: [],
            quoteFunnel: { draft: 0, sent: 0, accepted: 0, ordered: 0 },
          }
        }

        const { start, end } = dateRangeConfig

      // Fetch from quotes table (this is the primary source - orders table doesn't exist)
      // Skip orders table query since it doesn't exist in this database
      const ordersTableData: any[] = []
      
      console.log('Skipping orders table (does not exist), using quotes only')
      
      // Also fetch from quotes table (this is the primary source in Eastern Europe B2B style)
      // For company users, quotes table uses user_id. For admin, show all.
      let quotesQuery = supabase
        .from('quotes')
        .select('*')

      // For company users, filter by user_id (TEXT field). For admin, show all quotes.
      if (!isAdmin && user?.id) {
        quotesQuery = quotesQuery.eq('user_id', user.id.toString())
      }

      if (start) {
        quotesQuery = quotesQuery.gte('created_at', start)
      }
      quotesQuery = quotesQuery.lte('created_at', end)

      const { data: quotesTableData, error: quotesError } = await quotesQuery.order('created_at', { ascending: false })
      
      // Filter quotes - already filtered by user_id for company users, so use as-is
      const filteredQuotes = quotesTableData || []
      
      console.log('Quotes fetched:', { count: filteredQuotes.length, total: quotesTableData?.length || 0 })

      // Combine orders and quotes, treating approved quotes as paid orders
      const allOrdersFromTable = ordersTableData || []
      const allQuotesFromTable = filteredQuotes || []

        // Transform quotes to orders format for analytics
        const quotesAsOrders = (allQuotesFromTable || []).map((q: any) => ({
          id: q.id,
          quote_id: q.id,
          company_id: q.company_id || companyId,
        customer_id: q.customer_id || '',
        customer_email: q.customer_email || q.email || '',
        customer_name: q.customer_name || q.company_name || '',
        items: q.items || [],
        subtotal: parseFloat(String(q.subtotal || q.total || 0)),
        tax: parseFloat(String(q.tax || 0)),
        shipping: parseFloat(String(q.shipping || 0)),
        total: parseFloat(String(q.total || 0)),
        status: q.status === 'approved' ? 'paid' : 'pending',
        payment_status: q.status === 'approved' ? 'paid' : 'pending',
        created_at: q.created_at,
        updated_at: q.updated_at || q.created_at,
      }))

      // Combine both sources, prioritizing orders table data
      const allOrdersCombined = [...allOrdersFromTable, ...quotesAsOrders]
      
      // Remove duplicates (if a quote was converted to an order, prefer the order)
      const uniqueOrders = new Map()
      allOrdersCombined.forEach((o: any) => {
        const key = o.quote_id || o.id
        if (!uniqueOrders.has(key) || o.payment_status === 'paid' || o.status === 'paid') {
          uniqueOrders.set(key, o)
        }
      })
      const allOrders = Array.from(uniqueOrders.values())
      
      // Filter for paid orders (either payment_status='paid' or status='paid' or approved quotes)
      const ordersData = allOrders.filter(
        (o: any) => o.payment_status === 'paid' || o.status === 'paid' || o.status === 'approved'
      )

      // Fetch quotes for funnel (last 30 days) - Admin only
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      let quotesFunnelQuery = supabase
        .from('quotes')
        .select('*')
        .gte('created_at', thirtyDaysAgo.toISOString())
      
      // For admin, show all. For company users, filter by user_id (TEXT field)
      if (!isAdmin && user?.id) {
        quotesFunnelQuery = quotesFunnelQuery.eq('user_id', user.id.toString())
      }
      
      const { data: quotesFunnelData } = await quotesFunnelQuery
      const quotesData = quotesFunnelData || []
      
      console.log('Quotes for funnel:', { count: quotesData.length })

      // Fetch products for low stock (quantity < 10)
      // Products table uses 'quantity' not 'stock'
      // In this B2B model, company users (buyers) don't own products - they order from supplier
      // So show all low stock products for both admin and company users
      let productsQuery = supabase
        .from('products')
        .select('id, sku, name, quantity')
        .lt('quantity', 10)
        .order('quantity', { ascending: true })
        .limit(10)
      
      // No filter needed - show all low stock products for everyone
      // (Company users need to see what's available/low stock to order)
      
      const { data: productsData, error: productsError } = await productsQuery
      
      console.log('Products fetched:', { 
        count: productsData?.length || 0, 
        error: productsError,
        isAdmin,
      })
      
      const finalProductsData = productsData || []

      // Log errors for debugging (but don't fail the whole query)
      // These are expected - orders table doesn't exist, products might not have stock column
      // ordersError is always null (orders table doesn't exist), so skip this check
      if (quotesError) {
        console.warn('Error fetching quotes:', quotesError)
      }
      if (productsError) {
        console.warn('Error fetching products (might be column name issue):', productsError?.message || String(productsError))
      }

      // Calculate metrics
      const orders = ordersData || []
      const quotes = quotesData || []

      // Total Revenue (all time for this calculation)
      const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(String(o.total || 0)), 0)

      // Month-over-month revenue change
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

      const thisMonthRevenue = orders
        .filter((o) => new Date(o.created_at) >= thisMonthStart)
        .reduce((sum, o) => sum + parseFloat(String(o.total || 0)), 0)

      const lastMonthRevenue = orders
        .filter(
          (o) =>
            new Date(o.created_at) >= lastMonthStart &&
            new Date(o.created_at) <= lastMonthEnd
        )
        .reduce((sum, o) => sum + parseFloat(String(o.total || 0)), 0)

      const totalRevenueMoM = calculatePercentageChange(thisMonthRevenue, lastMonthRevenue)

      // Total Orders
      const totalOrders = allOrders.length

      // Average Order Value
      const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0

      // Quotes → Orders conversion rate (last 30 days)
      const quotesLast30 = quotes || []
      // Count orders that came from quotes (have quote_id) or are approved quotes
      const ordersFromQuotesLast30 = allOrders.filter(
        (o) => {
          const orderDate = new Date(o.created_at)
          return (
            orderDate >= thirtyDaysAgo &&
            (o.quote_id || (o.status === 'approved' && quotesLast30.some((q: any) => q.id === o.id || q.id === o.quote_id)))
          )
        }
      ).length
      const quotesToOrdersConversion =
        quotesLast30.length > 0
          ? (ordersFromQuotesLast30 / quotesLast30.length) * 100
          : 0

      // Revenue over time (monthly, last 12 months or all data)
      const revenueByMonth = new Map<string, number>()
      const monthsToShow = 12
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - monthsToShow)

      orders.forEach((order) => {
        const orderDate = new Date(order.created_at)
        if (orderDate >= cutoffDate || dateRange === 'alltime') {
          const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
          revenueByMonth.set(
            monthKey,
            (revenueByMonth.get(monthKey) || 0) + parseFloat(String(order.total || 0))
          )
        }
      })

      const revenueOverTime = Array.from(revenueByMonth.entries())
        .map(([monthKey, revenue]) => {
          const [year, month] = monthKey.split('-')
          const date = new Date(parseInt(year), parseInt(month) - 1)
          return {
            month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            revenue,
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.month)
          const dateB = new Date(b.month)
          return dateA.getTime() - dateB.getTime()
        })

      // Top 10 Products by revenue
      const productRevenue = new Map<
        string,
        { sku: string; name: string; revenue: number; quantity: number }
      >()

      orders.forEach((order) => {
        const items = order.items || []
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const sku = item.sku || 'UNKNOWN'
            const existing = productRevenue.get(sku)
            const revenue = parseFloat(String(item.total || item.unit_price * item.quantity || 0))
            const quantity = parseInt(String(item.quantity || 0))

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
        }
      })

      const topProducts = Array.from(productRevenue.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Top 10 Customers by revenue
      const customerRevenue = new Map<
        string,
        { companyName: string; totalSpent: number; ordersCount: number; lastOrderDate: string }
      >()

      orders.forEach((order) => {
        const customerKey = order.customer_email || 'unknown'
        const companyName = order.customer_name || 'Unknown Company'
        const existing = customerRevenue.get(customerKey)
        const revenue = parseFloat(String(order.total || 0))
        const orderDate = order.created_at

        if (existing) {
          existing.totalSpent += revenue
          existing.ordersCount += 1
          if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
            existing.lastOrderDate = orderDate
          }
        } else {
          customerRevenue.set(customerKey, {
            companyName,
            totalSpent: revenue,
            ordersCount: 1,
            lastOrderDate: orderDate,
          })
        }
      })

      const topCustomers = Array.from(customerRevenue.values())
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10)
        .map((customer, index) => ({
          ...customer,
          rank: index + 1,
        }))

      // Low stock products (use quantity field)
      const lowStockProducts = (finalProductsData || []).map((p: any) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.quantity ?? 0,
      }))

      // Quote funnel (last 30 days) - Admin only
      const quoteFunnel = {
        draft: quotesLast30.length,
        sent: quotesLast30.filter((q: any) => q.status === 'pending' || q.status === 'new').length,
        accepted: quotesLast30.filter((q: any) => q.status === 'approved').length,
        ordered: allOrders.filter(
          (o: any) => {
            const orderDate = new Date(o.created_at)
            return (
              orderDate >= thirtyDaysAgo &&
              (o.quote_id || (o.status === 'approved' && quotesLast30.some((q: any) => q.id === o.id || q.id === o.quote_id)))
            )
          }
        ).length,
      }

      // Company user specific data
      let myQuotesStatus, myRecentQuotes, myOrderStatus, myPendingQuotesCount
      
      if (!isAdmin && user?.id) {
        // Fetch user's own quotes (which are orders in this system)
        const { data: myQuotes } = await supabase
          .from('quotes')
          .select('id, order_number, total, status, created_at')
          .eq('user_id', user.id.toString())
          .order('created_at', { ascending: false })
          .limit(20)

        const myQuotesList = myQuotes || []
        
        // Quote status breakdown (these are actually orders)
        myQuotesStatus = {
          pending: myQuotesList.filter((q: any) => q.status === 'pending' || q.status === 'new').length,
          approved: myQuotesList.filter((q: any) => q.status === 'approved').length,
          rejected: myQuotesList.filter((q: any) => q.status === 'rejected').length,
          expired: myQuotesList.filter((q: any) => q.status === 'expired').length,
        }
        
        // Recent orders (from quotes table)
        myRecentQuotes = myQuotesList.slice(0, 5).map((q: any) => ({
          id: q.id,
          order_number: q.order_number || (typeof q.id === 'number' ? q.id : parseInt(String(q.id)) || undefined),
          total: parseFloat(String(q.total || 0)),
          status: q.status,
          created_at: q.created_at,
        }))
        
        // Pending quotes count
        myPendingQuotesCount = myQuotesStatus.pending
        
        // Order status breakdown (from user's orders/quotes)
        const myOrdersList = allOrders.filter((o: any) => {
          // Match by user_id or customer_id
          return o.customer_id === user.id || o.user_id === user.id
        })
        
        myOrderStatus = {
          pending: myOrdersList.filter((o: any) => o.status === 'pending').length,
          approved: myOrdersList.filter((o: any) => o.status === 'approved' || o.status === 'paid').length,
          processing: myOrdersList.filter((o: any) => o.status === 'processing').length,
          shipped: myOrdersList.filter((o: any) => o.status === 'shipped').length,
          delivered: myOrdersList.filter((o: any) => o.status === 'delivered').length,
        }
      }

      const result = {
        totalRevenue,
        totalRevenueMoM,
        totalOrders,
        averageOrderValue,
        quotesToOrdersConversion,
        revenueOverTime,
        topProducts,
        topCustomers,
        lowStockProducts,
        quoteFunnel,
        myQuotesStatus,
        myRecentQuotes,
        myOrderStatus,
        myPendingQuotesCount,
      }

        // Debug logging
        console.log('Analytics data:', {
          ordersCount: orders.length,
          allOrdersCount: allOrders.length,
          quotesCount: quotes.length,
          productsCount: productsData?.length || 0,
          totalRevenue,
          totalOrders,
        })

        return result
      } catch (err) {
        console.error('Error in analytics query:', err)
        // Return empty analytics data structure on error
        return {
          totalRevenue: 0,
          totalRevenueMoM: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          quotesToOrdersConversion: 0,
          revenueOverTime: [],
          topProducts: [],
          topCustomers: [],
          lowStockProducts: [],
          quoteFunnel: { draft: 0, sent: 0, accepted: 0, ordered: 0 },
        }
      }
    },
    enabled: !!user?.id || isAdmin,
    retry: 1,
  })

  // Always show dashboard - use empty data if analytics is null
  // This must be BEFORE any conditional returns to follow React hooks rules
  const displayData: AnalyticsData = analytics || {
    totalRevenue: 0,
    totalRevenueMoM: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    quotesToOrdersConversion: 0,
    revenueOverTime: [],
    topProducts: [],
    topCustomers: [],
    lowStockProducts: [],
    quoteFunnel: { draft: 0, sent: 0, accepted: 0, ordered: 0 },
    myQuotesStatus: undefined,
    myRecentQuotes: undefined,
    myOrderStatus: undefined,
    myPendingQuotesCount: undefined,
  }

  // Generate sparkline data for metric cards (last 7 data points)
  // This must be BEFORE any conditional returns to follow React hooks rules
  const sparklineData = useMemo(() => {
    if (!displayData?.revenueOverTime) return []
    return displayData.revenueOverTime.slice(-7).map((d) => d.revenue)
  }, [displayData])

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 mb-2" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassCard key={i} className="p-6">
              <Skeleton className="h-12 w-12 mb-4 rounded-lg" />
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-8 w-24" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    console.error('Analytics error:', error)
    return (
      <div className="p-6">
        <GlassCard className="p-12">
          <div className="text-center">
            <BarChart3 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">Error loading analytics</h3>
            <p className="text-muted-foreground mb-6">
              {error instanceof Error ? error.message : 'Failed to load analytics data'}
            </p>
            <Button onClick={() => window.location.reload()}>Refresh</Button>
          </div>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your business performance and make data-driven decisions
          </p>
        </div>
        <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last30">Last 30 days</SelectItem>
            <SelectItem value="last90">Last 90 days</SelectItem>
            <SelectItem value="alltime">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-500" />
            </div>
            {sparklineData.length > 1 && (
              <div className="w-20 h-10 opacity-70">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={sparklineData.map((v, i) => ({ value: v, index: i }))}
                    margin={{ top: 2, right: 2, bottom: 2, left: 2 }}
                  >
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(displayData.totalRevenue)}</p>
            <div className="flex items-center gap-1 text-xs">
              {displayData.totalRevenueMoM >= 0 ? (
                <TrendingUp className="w-3 h-3 text-green-500" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-500" />
              )}
              <span
                className={displayData.totalRevenueMoM >= 0 ? 'text-green-500' : 'text-red-500'}
              >
                {Math.abs(displayData.totalRevenueMoM).toFixed(1)}% MoM
              </span>
            </div>
          </div>
        </GlassCard>

        {/* Total Orders */}
        <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <ShoppingCart className="w-5 h-5 text-purple-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold">{displayData.totalOrders}</p>
          </div>
        </GlassCard>

        {/* Average Order Value */}
        <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Average Order Value</p>
            <p className="text-2xl font-bold">{formatCurrency(displayData.averageOrderValue)}</p>
          </div>
        </GlassCard>

        {/* Quotes → Orders Conversion (Admin only) */}
        {isAdmin && (
          <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Quotes → Orders</p>
              <p className="text-2xl font-bold">
                {displayData.quotesToOrdersConversion.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </div>
          </GlassCard>
        )}

        {/* Pending Quotes (Company users only) */}
        {!isAdmin && displayData.myPendingQuotesCount !== undefined && (
          <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <FileText className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Pending Quotes</p>
              <p className="text-2xl font-bold">{displayData.myPendingQuotesCount}</p>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Revenue Over Time */}
      <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4">Revenue Over Time</h3>
        {displayData.revenueOverTime.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={displayData.revenueOverTime}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                dataKey="month"
                className="text-xs"
                stroke="currentColor"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                className="text-xs"
                stroke="currentColor"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [formatCurrency(value), 'Revenue']}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No revenue data available
          </div>
        )}
      </GlassCard>

      {/* Top 10 Products by Revenue */}
      <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
        <h3 className="text-lg font-semibold mb-4">Top 10 Products by Revenue</h3>
        {displayData.topProducts.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={displayData.topProducts}
              layout="vertical"
              margin={{ left: 100, right: 20, top: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
              <XAxis
                type="number"
                className="text-xs"
                stroke="currentColor"
                tick={{ fill: 'currentColor' }}
                tickFormatter={(value) => `€${(value / 1000).toFixed(0)}k`}
              />
              <YAxis
                type="category"
                dataKey="name"
                className="text-xs"
                stroke="currentColor"
                tick={{ fill: 'currentColor' }}
                width={90}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, _name: string, props: any) => [
                  `${formatCurrency(value)} (${props.payload.quantity} sold)`,
                  'Revenue',
                ]}
              />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[400px] flex items-center justify-center text-muted-foreground">
            No product sales data available
          </div>
        )}
      </GlassCard>

      {/* Top 10 Customers by Revenue (Admin only) */}
      {isAdmin && (
        <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Top 10 Customers by Revenue</h3>
          {displayData.topCustomers.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Rank</TableHead>
                    <TableHead>Company Name</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead>Last Order</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.topCustomers.map((customer, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-semibold">#{idx + 1}</TableCell>
                      <TableCell className="font-medium">{customer.companyName}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-right">{customer.ordersCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              No customer data available
            </div>
          )}
        </GlassCard>
      )}

      {/* Recent Low-Stock Products */}
      <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Low-Stock Products</h3>
          <Badge variant="destructive">{displayData.lowStockProducts.length} items</Badge>
        </div>
        {displayData.lowStockProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Alert</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {displayData.lowStockProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{product.sku}</p>
                      </div>
                    </TableCell>
                    <TableCell>{product.stock} units</TableCell>
                    <TableCell>
                      {product.stock <= 5 ? (
                        <Badge variant="destructive">Critical</Badge>
                      ) : (
                        <Badge variant="secondary">Low</Badge>
                      )}
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

      {/* Quote Funnel (Admin only) */}
      {isAdmin && (
        <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
          <h3 className="text-lg font-semibold mb-4">Quote Funnel (Last 30 Days)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Draft */}
            <div className="p-4 rounded-lg border border-border/50 bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Draft</span>
              </div>
              <p className="text-2xl font-bold mb-1">{displayData.quoteFunnel.draft}</p>
              <p className="text-xs text-muted-foreground">100%</p>
            </div>

            {/* Sent */}
            <div className="p-4 rounded-lg border border-border/50 bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                <Send className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Sent</span>
              </div>
              <p className="text-2xl font-bold mb-1">{displayData.quoteFunnel.sent}</p>
              <p className="text-xs text-muted-foreground">
                {displayData.quoteFunnel.draft > 0
                  ? ((displayData.quoteFunnel.sent / displayData.quoteFunnel.draft) * 100).toFixed(1)
                  : 0}
                % from draft
              </p>
            </div>

            {/* Accepted */}
            <div className="p-4 rounded-lg border border-border/50 bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm font-medium">Accepted</span>
              </div>
              <p className="text-2xl font-bold mb-1">{displayData.quoteFunnel.accepted}</p>
              <p className="text-xs text-muted-foreground">
                {displayData.quoteFunnel.sent > 0
                  ? ((displayData.quoteFunnel.accepted / displayData.quoteFunnel.sent) * 100).toFixed(1)
                  : 0}
                % from sent
              </p>
            </div>

            {/* Ordered */}
            <div className="p-4 rounded-lg border border-border/50 bg-white/50">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Ordered</span>
              </div>
              <p className="text-2xl font-bold mb-1">{displayData.quoteFunnel.ordered}</p>
              <p className="text-xs text-muted-foreground">
                {displayData.quoteFunnel.accepted > 0
                  ? ((displayData.quoteFunnel.ordered / displayData.quoteFunnel.accepted) * 100).toFixed(1)
                  : 0}
                % from accepted
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Company User Specific Sections */}
      {!isAdmin && displayData.myQuotesStatus && (
        <>
          {/* My Order Status Breakdown */}
          <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
            <h3 className="text-lg font-semibold mb-4">My Order Status</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg border border-border/50 bg-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="text-sm font-medium">Pending</span>
                </div>
                <p className="text-2xl font-bold">{displayData.myQuotesStatus.pending}</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Approved</span>
                </div>
                <p className="text-2xl font-bold">{displayData.myQuotesStatus.approved}</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm font-medium">Rejected</span>
                </div>
                <p className="text-2xl font-bold">{displayData.myQuotesStatus.rejected}</p>
              </div>
              <div className="p-4 rounded-lg border border-border/50 bg-white/50">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">Expired</span>
                </div>
                <p className="text-2xl font-bold">{displayData.myQuotesStatus.expired}</p>
              </div>
            </div>
          </GlassCard>

          {/* My Recent Orders */}
          {displayData.myRecentQuotes && displayData.myRecentQuotes.length > 0 && (
            <GlassCard className="p-6 bg-white/80 backdrop-blur border-border/50">
              <h3 className="text-lg font-semibold mb-4">My Recent Orders</h3>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order No.</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayData.myRecentQuotes.map((quote) => (
                      <TableRow key={quote.id}>
                        <TableCell className="font-mono text-sm font-semibold">
                          #{quote.order_number || quote.id}
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(quote.total)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              quote.status === 'approved'
                                ? 'default'
                                : quote.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                            }
                          >
                            {quote.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </GlassCard>
          )}

        </>
      )}
    </div>
  )
}
