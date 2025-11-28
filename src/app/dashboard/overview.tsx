import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatCurrency, calculatePercentageChange } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useUnpaidBalance } from '@/hooks/useUnpaidBalance'
import { useCompanyUnpaidBalances } from '@/hooks/useCompanyUnpaidBalances'
import {
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Bell,
  Image as ImageIcon,
  CreditCard,
  Building2,
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
    main_image?: string
    images?: string[]
  }>
  stockStatusCounts: {
    inStock: number
    lowStock: number
    outOfStock: number
  }
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
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  
  // Fetch unpaid balance for non-admin users
  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidBalance()
  
  // Fetch company unpaid balances for admin users (top 10)
  const { data: companyUnpaidData, isLoading: companyUnpaidLoading } = useCompanyUnpaidBalances(10)

  useEffect(() => {
    trackEvent(AnalyticsEvents.DASHBOARD_VIEWED)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats', user?.id, isAdmin],
    queryFn: async () => {
      // For admin, we can proceed without user.id (they see all data)
      // For company users, we need at least user.id (RLS will handle filtering)
      if (!isAdmin && !user?.id) return null

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      const thirtyDaysAgo = new Date(now)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // Fetch all quotes (treating them as orders since orders table doesn't exist)
      // Status workflow: 'new' (Processing), 'pending' (Awaiting Payment), 'shipped', 'approved' (Completed & Sent)
      const { data: allOrders } = await supabase
        .from('quotes')
        .select('total, created_at, user_id, items, status, id, order_number, company_name, email')
        .in('status', ['new', 'pending', 'shipped', 'approved'])

      // Fetch this month's quotes
      const { data: thisMonthOrders } = await supabase
        .from('quotes')
        .select('total, created_at, items, status')
        .in('status', ['new', 'pending', 'shipped', 'approved'])
        .gte('created_at', startOfMonth.toISOString())

      // Fetch last month's quotes
      const { data: lastMonthOrders } = await supabase
        .from('quotes')
        .select('total, created_at, status')
        .in('status', ['new', 'pending', 'shipped', 'approved'])
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())

      // Fetch recent orders from quotes table (last 5, newest first)
      // Admin sees all orders, company users see only their own (RLS handles this)
      const { data: recentOrdersData, error: recentOrdersError } = await supabase
        .from('quotes')
        .select('id, user_id, company_name, email, total, status, created_at, order_number')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (recentOrdersError) {
        console.error('Error fetching recent orders:', recentOrdersError)
      }

      // Fetch products - use the EXACT same query structure as products page to ensure consistency
      // Use select('*') to match products page, and use count queries for accurate totals
      // RLS will handle filtering for company users automatically
      
      // First, get counts for each stock status using the same filters as products page
      const lowStockCountQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('quantity', 0)
        .lte('quantity', 10)
      
      const outOfStockCountQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('quantity', 0)
      
      const inStockCountQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .gt('quantity', 10)
      
      // Execute count queries in parallel
      const [lowStockResult, outOfStockResult, inStockResult] = await Promise.all([
        lowStockCountQuery,
        outOfStockCountQuery,
        inStockCountQuery,
      ])
      
      // Extract counts
      const lowStockCount = lowStockResult.count ?? 0
      const outOfStockCount = outOfStockResult.count ?? 0
      const inStockCount = inStockResult.count ?? 0
      
      // Also fetch products for the low stock list (limit to reasonable number for display)
      // Use the same query structure as products page
      const { data: lowStockProductsData, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, quantity, category, weboffer_price, main_image, images')
        .gt('quantity', 0)
        .lte('quantity', 10)
        .order('quantity', { ascending: true })
        .limit(10) // Only need a few for display
      
      if (productsError) {
        console.error('Error fetching low stock products:', productsError)
      }
      
      // Normalize quantity field for display products
      const filteredProducts = (lowStockProductsData || []).map((p: any) => ({
        ...p,
        quantity: p.quantity ?? 0,
      }))

      // Calculate stats
      // Revenue includes all orders (Processing, Awaiting Payment, Shipped, Completed)
      // 'approved' = Completed & Sent (paid), others are in progress
      const approvedOrders = allOrders?.filter((o: any) => 
        o.status === 'approved' || o.status === 'shipped' || o.status === 'new' || o.status === 'pending'
      ) || []
      const totalRevenue = approvedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      // For revenue trend, count completed orders ('approved' = Completed & Sent)
      const thisMonthCompleted = thisMonthOrders?.filter((o: any) => o.status === 'approved') || []
      const thisMonthRevenue = thisMonthCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      const lastMonthCompleted = lastMonthOrders?.filter((o: any) => o.status === 'approved') || []
      const lastMonthRevenue = lastMonthCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      // For order counts, show all orders
      const totalOrders = allOrders?.length || 0
      const thisMonthOrdersCount = thisMonthOrders?.length || 0
      const lastMonthOrdersCount = lastMonthOrders?.length || 0

      // Active customers (unique user_ids or emails from quotes)
      const uniqueCustomers = new Set(
        allOrders?.map((o: any) => o.user_id || o.email).filter(Boolean) || []
      )
      const activeCustomers = uniqueCustomers.size

      // Products stats - use counts from database queries (matches products page exactly)
      // These counts are calculated using the EXACT same filters as products page:
      // - Low Stock: gt('quantity', 0).lte('quantity', 10) - quantity 1-10 inclusive
      // - Out of Stock: eq('quantity', 0) - quantity = 0
      // - In Stock: gt('quantity', 10) - quantity > 10
      const totalProducts = lowStockCount + outOfStockCount + inStockCount
      
      const stockStatusCounts = {
        inStock: inStockCount,
        lowStock: lowStockCount,
        outOfStock: outOfStockCount,
      }
      

      // Revenue by day (this month) - only count completed orders
      const revenueByDayMap = new Map<string, number>()
      thisMonthCompleted?.forEach((order) => {
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

      // Categories by revenue (from order items) - count ALL quotes (new, pending, approved)
      // This shows categories for all orders, not just approved ones
      // First, collect all unique product_ids AND skus from all quotes (not just approved)
      // Note: Product IDs may change after CSV re-imports, but SKUs are permanent
      const productIds = new Set<string>()
      const productSkus = new Set<string>()
      const allItems: Array<{ product_id: string; sku?: string; total: number }> = []
      
      // Use allOrders instead of approvedOrders for category calculation
      // This includes 'new', 'pending', and 'approved' statuses
      allOrders?.forEach((order: any) => {
        // Handle items - could be array or JSON string
        let items: Array<{ product_id?: string; sku?: string; total: number }> = []
        if (Array.isArray(order.items)) {
          items = order.items
        } else if (typeof order.items === 'string') {
          try {
            items = JSON.parse(order.items)
          } catch (e) {
            console.warn('Failed to parse items JSON:', e, order.items)
          }
        }
        
        items?.forEach((item) => {
          const productId = item.product_id
          const sku = item.sku
          if (productId) {
            // Normalize product_id to string
            const productIdStr = String(productId)
            productIds.add(productIdStr)
            if (sku) {
              productSkus.add(sku)
            }
            allItems.push({
              product_id: productIdStr,
              sku: sku,
              total: Number(item.total || 0),
            })
          }
        })
      })


      // Fetch all products that appear in approved quotes to get their categories
      // Product IDs in quotes are stored as strings, but products table uses SERIAL (integer) IDs
      const productsMap = new Map<string, string>() // product_id -> category
      if (productIds.size > 0) {
        const productIdsArray = Array.from(productIds)
        
        // Convert string IDs to integers for the query (products table uses SERIAL/integer IDs)
        const productIdsInt = productIdsArray
          .map(id => {
            const parsed = parseInt(id, 10)
            return isNaN(parsed) ? null : parsed
          })
          .filter((id): id is number => id !== null)
        
        
        if (productIdsInt.length > 0) {
          // Try multiple query strategies to find products
          // Strategy 1: Query by integer IDs
          let productsForCategories: any[] | null = null
          let productsForCategoriesError: any = null
          
          const { data, error } = await supabase
            .from('products')
            .select('id, category')
            .in('id', productIdsInt)
          
          productsForCategories = data
          productsForCategoriesError = error
          
          if (productsForCategoriesError) {
            console.error('Error fetching products for categories (by ID):', productsForCategoriesError)
          }
          
          // Strategy 2: If no products found, try querying as strings (in case Supabase auto-converts)
          if ((!productsForCategories || productsForCategories.length === 0) && productIdsInt.length > 0) {
            const { data: dataStr, error: errorStr } = await supabase
              .from('products')
              .select('id, category')
              .in('id', productIdsArray) // Try with original string array
            
            if (!errorStr && dataStr && dataStr.length > 0) {
              productsForCategories = dataStr
            }
          }
          
          // Strategy 3: If no products found by ID, try by SKU (SKUs are permanent, IDs may change)
          if ((!productsForCategories || productsForCategories.length === 0) && productSkus.size > 0) {
            const skusArray = Array.from(productSkus)
            const { data: productsBySku, error: errorBySku } = await supabase
              .from('products')
              .select('id, category, sku')
              .in('sku', skusArray)
            
            if (!errorBySku && productsBySku && productsBySku.length > 0) {
              productsForCategories = productsBySku
              
              // Create a map of SKU -> category for lookup
              const skuToCategoryMap = new Map<string, string>()
              productsBySku.forEach((p: any) => {
                skuToCategoryMap.set(p.sku, p.category || 'Uncategorized')
              })
              
              // Update allItems with categories from SKU lookup
              allItems.forEach((item) => {
                if (item.sku && skuToCategoryMap.has(item.sku)) {
                  const category = skuToCategoryMap.get(item.sku)!
                  // Store category by both product_id (for original lookup) and SKU
                  productsMap.set(item.product_id, category)
                  productsMap.set(item.sku, category)
                }
              })
            }
          }
          
          if (productsForCategories && productsForCategories.length > 0) {
            productsForCategories.forEach((p: any) => {
              // Store both string and integer versions for lookup
              const productIdStr = String(p.id)
              const category = p.category || 'Uncategorized'
              productsMap.set(productIdStr, category)
              // Also store the integer version as string
              if (typeof p.id === 'number') {
                productsMap.set(String(p.id), category)
              }
            })
          }
        }
      }

      // Calculate revenue by category
      const categoryRevenueMap = new Map<string, number>()
      allItems.forEach((item) => {
        const productIdStr = String(item.product_id)
        // Try to get category by product_id first, then by SKU
        let category = productsMap.get(productIdStr)
        if (!category && item.sku) {
          category = productsMap.get(item.sku)
        }
        category = category || 'Uncategorized'
        const currentRevenue = categoryRevenueMap.get(category) || 0
        categoryRevenueMap.set(category, currentRevenue + item.total)
      })
      
      
      let categoriesByRevenue = Array.from(categoryRevenueMap.entries())
        .map(([name, revenue]) => ({ name, value: revenue, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
      
      // If we couldn't find any products (productsMap is empty) but have "Uncategorized",
      // it means products weren't matched - hide the chart
      if (productsMap.size === 0 && categoriesByRevenue.length === 1 && categoriesByRevenue[0].name === 'Uncategorized') {
        categoriesByRevenue = []
      }

      // Recent orders (from quotes table)
      const recentOrders = (recentOrdersData || []).map((order: any) => {
        let orderNumber: number | string | undefined = order.order_number
        
        // Fallback to using first 8 chars of order id if no order_number
        if (!orderNumber) {
          orderNumber = typeof order.id === 'string' 
            ? order.id.slice(0, 8).toUpperCase() 
            : typeof order.id === 'number'
            ? order.id
            : String(order.id).slice(0, 8).toUpperCase()
        }
        
        return {
          id: String(order.id),
          order_number: orderNumber,
          customer_name: order.company_name || 'Unknown',
          customer_email: order.email || '',
          total: Number(order.total || 0),
          status: order.status,
          created_at: order.created_at,
        }
      })

      // Low stock products (for display - already fetched above)
      const lowStock = filteredProducts.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        stock: p.quantity || 0,
        category: p.category,
        main_image: p.main_image,
        images: p.images || [],
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
        lowStockCount: lowStockCount,
        revenueByDay,
        ordersByDay,
        categoriesByRevenue,
        recentOrders,
        lowStockProducts: lowStock,
        stockStatusCounts,
      } as DashboardStats
    },
    enabled: isAdmin || !!user?.id,
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
        
        {/* Role-based card: Admin sees Active Customers, Company users see Unpaid Balance */}
        {isAdmin ? (
          <StatCard
            title="Active Customers"
            value={stats?.activeCustomers.toString() || '—'}
            subtitle="Placed orders"
            icon={Users}
            color="text-purple-500"
          />
        ) : (
          <GlassCard hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">Unpaid Balance</p>
                {isLoading || unpaidLoading ? (
                  <Skeleton className="h-10 w-32 mb-2" />
                ) : (
                  <p className="text-3xl font-bold mb-1">
                    {unpaidData ? formatCurrency(unpaidData.unpaidBalance, 'EUR') : '€0.00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-2">
                  {unpaidData?.unpaidOrdersCount === 1
                    ? '1 order awaiting payment'
                    : `${unpaidData?.unpaidOrdersCount || 0} orders awaiting payment`}
                </p>
                {unpaidData && unpaidData.unpaidOrdersCount > 0 && (
                  <button
                    onClick={() => navigate('/dashboard/orders?filter=pending')}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    View pending orders
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="p-3 rounded-lg bg-white/10 dark:bg-black/10">
                <CreditCard className={`w-6 h-6 ${unpaidData && unpaidData.unpaidBalance > 0 ? 'text-amber-500' : 'text-green-500'}`} />
              </div>
            </div>
          </GlassCard>
        )}
        
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

      {/* Admin Only: Unpaid Balances by Company */}
      {isAdmin && (
        <GlassCard className="border border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Building2 className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Unpaid Balances by Company</h2>
                {companyUnpaidData && !companyUnpaidLoading && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Total unpaid: <span className="font-semibold text-amber-500">{formatCurrency(companyUnpaidData.totalUnpaidAmount, 'EUR')}</span>
                    <span className="mx-2">•</span>
                    {companyUnpaidData.totalOrdersCount} {companyUnpaidData.totalOrdersCount === 1 ? 'order' : 'orders'}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate('/dashboard/unpaid-balances')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5 dark:hover:bg-black/5 border border-white/10 dark:border-white/5"
            >
              View All
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          
          {companyUnpaidLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : companyUnpaidData && companyUnpaidData.companies.length > 0 ? (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                      <th className="pb-3 font-medium">Company</th>
                      <th className="pb-3 font-medium text-right">Unpaid Amount</th>
                      <th className="pb-3 font-medium text-center">Orders</th>
                      <th className="pb-3 font-medium text-right">Last Order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 dark:divide-white/5">
                    {companyUnpaidData.companies.map((company, index) => {
                      const isHighAmount = company.unpaidAmount >= 5000
                      const isMediumAmount = company.unpaidAmount >= 1000 && company.unpaidAmount < 5000
                      
                      return (
                        <tr
                          key={company.email || company.companyName || index}
                          onClick={() => navigate(`/dashboard/orders?company=${encodeURIComponent(company.companyName || company.email)}&filter=pending`)}
                          className="hover:bg-white/5 dark:hover:bg-black/5 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                {(company.companyName || company.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{company.companyName || 'Unknown Company'}</p>
                                {company.email && (
                                  <p className="text-xs text-muted-foreground truncate max-w-[200px]">{company.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {isHighAmount && <AlertTriangle className="w-4 h-4 text-red-500" />}
                              <span className={`font-semibold ${isHighAmount ? 'text-red-500' : isMediumAmount ? 'text-amber-500' : 'text-foreground'}`}>
                                {formatCurrency(company.unpaidAmount, 'EUR')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 text-center">
                            <Badge variant="outline" className="bg-white/5 dark:bg-black/5">
                              {company.orderCount}
                            </Badge>
                          </td>
                          <td className="py-3.5 text-right text-sm text-muted-foreground">
                            {new Date(company.lastOrderDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {companyUnpaidData.companies.map((company, index) => {
                  const isHighAmount = company.unpaidAmount >= 5000
                  const isMediumAmount = company.unpaidAmount >= 1000 && company.unpaidAmount < 5000
                  
                  return (
                    <div
                      key={company.email || company.companyName || index}
                      onClick={() => navigate(`/dashboard/orders?company=${encodeURIComponent(company.companyName || company.email)}&filter=pending`)}
                      className="p-4 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 border border-white/10 dark:border-white/5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {(company.companyName || company.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{company.companyName || 'Unknown Company'}</p>
                            {company.email && (
                              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{company.email}</p>
                            )}
                          </div>
                        </div>
                        {isHighAmount && <AlertTriangle className="w-4 h-4 text-red-500" />}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-muted-foreground text-xs">Unpaid</span>
                            <p className={`font-semibold ${isHighAmount ? 'text-red-500' : isMediumAmount ? 'text-amber-500' : 'text-foreground'}`}>
                              {formatCurrency(company.unpaidAmount, 'EUR')}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">Orders</span>
                            <p className="font-medium">{company.orderCount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">Last Order</span>
                          <p className="text-sm">
                            {new Date(company.lastOrderDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border border-dashed border-white/10 dark:border-white/5 rounded-lg bg-white/5 dark:bg-black/5">
              <CreditCard className="w-8 h-8 mb-3 text-green-500" />
              <p className="text-sm font-medium">No unpaid orders</p>
              <p className="text-xs mt-1">All companies are up to date with payments</p>
            </div>
          )}
        </GlassCard>
      )}

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
                    {stats.categoriesByRevenue.map((_entry, index) => (
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
        <GlassCard className="border border-white/10 dark:border-white/5">
          <div className="flex items-center justify-between mb-5 pb-4 border-b border-white/10 dark:border-white/5">
            <h2 className="text-xl font-semibold">Recent Orders</h2>
            <button
              onClick={() => navigate('/dashboard/orders')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 dark:hover:bg-black/5"
            >
              View all
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 border border-white/10 dark:border-white/5 hover:border-white/20 dark:hover:border-white/10 shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <span className="font-mono font-semibold text-sm text-foreground">
                        #{order.order_number || order.id.slice(0, 8)}
                      </span>
                    </div>
                    <div className="flex-shrink-0 text-xs text-muted-foreground font-medium">
                      {new Date(order.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </div>
                    <div className="flex-1 min-w-0 truncate">
                      <p className="text-sm font-medium truncate text-foreground">
                        {order.customer_name || order.customer_email}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      <OrderStatusBadge status={order.status as any} />
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="font-semibold text-sm text-foreground">{formatCurrency(order.total, 'EUR')}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground border border-dashed border-white/10 dark:border-white/5 rounded-lg">
              <p className="text-sm">No recent orders</p>
            </div>
          )}
        </GlassCard>

        {/* Low Stock Alert */}
        <GlassCard className="border border-white/10 dark:border-white/5">
          <div className="mb-5 pb-4 border-b border-white/10 dark:border-white/5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="relative">
                <Bell className="w-5 h-5 text-muted-foreground" />
                {stats && stats.lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full border border-white/20"></span>
                )}
              </div>
              <h2 className="text-xl font-semibold">Low Stock Alert</h2>
            </div>
            
            {/* Stock Status Bubbles - Real Data */}
            {stats && !isLoading && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* In Stock - Green (quantity >= 10) */}
                {stats.stockStatusCounts.inStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shadow-sm hover:bg-green-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      In Stock: {stats.stockStatusCounts.inStock}
                    </span>
                  </div>
                )}
                
                {/* Low Stock - Orange (1-9) */}
                {stats.stockStatusCounts.lowStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-sm hover:bg-orange-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                      Low Stock: {stats.stockStatusCounts.lowStock}
                    </span>
                  </div>
                )}
                
                {/* Out of Stock - Red (0) */}
                {stats.stockStatusCounts.outOfStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-sm hover:bg-red-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                      Out of Stock: {stats.stockStatusCounts.outOfStock}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
          {isLoading ? (
            <div className="space-y-2.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : stats && stats.lowStockCount > 0 ? (
            <>
              <p className="text-base font-semibold text-foreground mb-5 px-1">
                {stats.lowStockCount} products low on stock
              </p>
              <div className="space-y-2.5 mb-5">
                {stats.lowStockProducts
                  .sort((a, b) => a.stock - b.stock)
                  .slice(0, 5)
                  .map((product) => {
                    const imageUrl = product.main_image || (product.images && product.images.length > 0 ? product.images[0] : null)
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3.5 p-3.5 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 border border-white/10 dark:border-white/5 hover:border-white/20 dark:hover:border-white/10 shadow-sm hover:shadow-md"
                      >
                        <div className="flex-shrink-0 w-11 h-11 rounded-md bg-muted/50 flex items-center justify-center overflow-hidden border border-white/10 dark:border-white/5 shadow-sm">
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.nextElementSibling?.classList.remove('hidden')
                              }}
                            />
                          ) : null}
                          <ImageIcon className={`w-5 h-5 text-muted-foreground ${imageUrl ? 'hidden' : ''}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate text-foreground mb-0.5">{product.name}</p>
                          <p className="text-xs text-muted-foreground font-medium">SKU: {product.sku}</p>
                        </div>
                        <div className="flex-shrink-0">
                          <Badge 
                            variant="outline" 
                            className="bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 text-xs font-medium shadow-sm"
                          >
                            Only {product.stock} left
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="flex justify-end pt-3 border-t border-white/10 dark:border-white/5">
                <button
                  onClick={() => navigate('/dashboard/products?filter=low-stock')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 dark:hover:bg-black/5"
                >
                  View all
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2.5 py-12 text-muted-foreground border border-dashed border-white/10 dark:border-white/5 rounded-lg bg-white/5 dark:bg-black/5">
              <Package className="w-4 h-4" />
              <p className="text-sm font-medium">All products have sufficient stock</p>
            </div>
          )}
        </GlassCard>
      </div>

    </div>
  )
}
