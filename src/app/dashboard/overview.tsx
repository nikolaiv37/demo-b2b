import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { OrderStatusBadge } from '@/components/OrderStatusBadge'
import { formatCurrency, calculatePercentageChange } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import { useTenant, useTenantPath } from '@/lib/tenant/TenantProvider'
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
import type { LucideIcon } from 'lucide-react'
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

interface QuoteRow {
  id?: string | number | null
  order_number?: string | number | null
  user_id?: string | null
  company_name?: string | null
  email?: string | null
  total?: string | number | null
  status?: string | null
  created_at?: string
  items?: unknown
}

interface ProductRow {
  id?: string | number | null
  sku?: string | null
  name?: string | null
  quantity?: string | number | null
  category?: string | null
  main_image?: string | null
  images?: string[] | null
}

interface OrderItemRow {
  product_id?: string | number | null
  sku?: string | null
  total?: string | number | null
}

interface ProductCategoryRow {
  id?: string | number | null
  category?: string | null
  sku?: string | null
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
  const { t } = useTranslation()
  const { user, isAdmin } = useAuth()
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  const navigate = useNavigate()
  const { withBase } = useTenantPath()
  
  // Fetch unpaid balance for non-admin users
  const { data: unpaidData, isLoading: unpaidLoading } = useUnpaidBalance()
  
  // Fetch company unpaid balances for admin users (top 10)
  const { data: companyUnpaidData, isLoading: companyUnpaidLoading } = useCompanyUnpaidBalances(10)

  useEffect(() => {
    trackEvent(AnalyticsEvents.DASHBOARD_VIEWED)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['tenant', tenantId, 'dashboard-stats', user?.id, isAdmin],
    queryFn: async () => {
      if (!tenantId) return null
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
      const { data: allOrdersRaw } = await supabase
        .from('quotes')
        .select('total, created_at, user_id, items, status, id, order_number, company_name, email')
        .in('status', ['new', 'pending', 'shipped', 'approved'])
        .eq('tenant_id', tenantId)
      const allOrders = (allOrdersRaw as QuoteRow[] | null) ?? []

      // Fetch this month's quotes
      const { data: thisMonthOrdersRaw } = await supabase
        .from('quotes')
        .select('total, created_at, items, status')
        .in('status', ['new', 'pending', 'shipped', 'approved'])
        .gte('created_at', startOfMonth.toISOString())
        .eq('tenant_id', tenantId)
      const thisMonthOrders = (thisMonthOrdersRaw as QuoteRow[] | null) ?? []

      // Fetch last month's quotes
      const { data: lastMonthOrdersRaw } = await supabase
        .from('quotes')
        .select('total, created_at, status')
        .in('status', ['new', 'pending', 'shipped', 'approved'])
        .gte('created_at', startOfLastMonth.toISOString())
        .lte('created_at', endOfLastMonth.toISOString())
        .eq('tenant_id', tenantId)
      const lastMonthOrders = (lastMonthOrdersRaw as QuoteRow[] | null) ?? []

      // Fetch recent orders from quotes table (last 5, newest first)
      // Admin sees all orders, company users see only their own (RLS handles this)
      const { data: recentOrdersDataRaw, error: recentOrdersError } = await supabase
        .from('quotes')
        .select('id, user_id, company_name, email, total, status, created_at, order_number')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)
      const recentOrdersData = (recentOrdersDataRaw as QuoteRow[] | null) ?? []
      
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
        .eq('tenant_id', tenantId)
        .gt('quantity', 0)
        .lte('quantity', 10)
      
      const outOfStockCountQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('quantity', 0)
      
      const inStockCountQuery = supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
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
      const { data: lowStockProductsDataRaw, error: productsError } = await supabase
        .from('products')
        .select('id, sku, name, quantity, category, weboffer_price, main_image, images')
        .gt('quantity', 0)
        .lte('quantity', 10)
        .eq('tenant_id', tenantId)
        .order('quantity', { ascending: true })
        .limit(10) // Only need a few for display
      const lowStockProductsData = (lowStockProductsDataRaw as ProductRow[] | null) ?? []
      
      if (productsError) {
        console.error('Error fetching low stock products:', productsError)
      }
      
      // Normalize quantity field for display products
      const filteredProducts = (lowStockProductsData || []).map((p) => ({
        ...p,
        quantity: Number(p.quantity ?? 0),
      }))

      // Calculate stats
      // Revenue includes all orders (Processing, Awaiting Payment, Shipped, Completed)
      // 'approved' = Completed & Sent (paid), others are in progress
      const approvedOrders = allOrders.filter((o) => 
        o.status === 'approved' || o.status === 'shipped' || o.status === 'new' || o.status === 'pending'
      )
      const totalRevenue = approvedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      // For revenue trend, count completed orders ('approved' = Completed & Sent)
      const thisMonthCompleted = thisMonthOrders.filter((o) => o.status === 'approved')
      const thisMonthRevenue = thisMonthCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      const lastMonthCompleted = lastMonthOrders.filter((o) => o.status === 'approved')
      const lastMonthRevenue = lastMonthCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0)
      
      // For order counts, show all orders
      const totalOrders = allOrders.length
      const thisMonthOrdersCount = thisMonthOrders.length
      const lastMonthOrdersCount = lastMonthOrders.length

      // Active customers (unique user_ids or emails from quotes)
      const uniqueCustomers = new Set(
        allOrders.map((o) => o.user_id || o.email).filter(Boolean)
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
      thisMonthCompleted.forEach((order) => {
        const date = new Date(order.created_at ?? 0).toISOString().split('T')[0]
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
      allOrders.forEach((order) => {
        const orderDate = new Date(order.created_at ?? 0)
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
      const normalizeItems = (
        rawItems: unknown
      ): Array<{ product_id: string; sku?: string; total: number }> => {
        const normalized: Array<{ product_id: string; sku?: string; total: number }> = []

        const pushItem = (item: OrderItemRow) => {
          const productId = item.product_id ?? null
          if (productId === null || productId === undefined) return
          const productIdStr = String(productId)
          if (!productIdStr) return
          normalized.push({
            product_id: productIdStr,
            sku: item.sku || undefined,
            total: Number(item.total ?? 0),
          })
        }

        if (Array.isArray(rawItems)) {
          rawItems.forEach((item) => pushItem(item as OrderItemRow))
          return normalized
        }

        if (typeof rawItems === 'string') {
          try {
            const parsed = JSON.parse(rawItems)
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => pushItem(item as OrderItemRow))
            }
          } catch (e) {
            console.warn('Failed to parse items JSON:', e, rawItems)
          }
        }

        return normalized
      }

      allOrders.forEach((order) => {
        const items = normalizeItems(order.items)
        
        items.forEach((item) => {
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
          let productsForCategories: ProductCategoryRow[] = []
          
          const { data, error } = await supabase
            .from('products')
            .select('id, category')
            .in('id', productIdsInt)
            .eq('tenant_id', tenantId)
          
          productsForCategories = (data as ProductCategoryRow[] | null) ?? []
          
          if (error) {
            console.error('Error fetching products for categories (by ID):', error)
          }
          
          // Strategy 2: If no products found, try querying as strings (in case Supabase auto-converts)
          if ((!productsForCategories || productsForCategories.length === 0) && productIdsInt.length > 0) {
            const { data: dataStr, error: errorStr } = await supabase
              .from('products')
              .select('id, category')
              .in('id', productIdsArray) // Try with original string array
              .eq('tenant_id', tenantId)
            
            if (!errorStr && dataStr && dataStr.length > 0) {
              productsForCategories = dataStr as ProductCategoryRow[]
            }
          }
          
          // Strategy 3: If no products found by ID, try by SKU (SKUs are permanent, IDs may change)
          if ((!productsForCategories || productsForCategories.length === 0) && productSkus.size > 0) {
            const skusArray = Array.from(productSkus)
            const { data: productsBySku, error: errorBySku } = await supabase
              .from('products')
              .select('id, category, sku')
              .in('sku', skusArray)
              .eq('tenant_id', tenantId)
            
            if (!errorBySku && productsBySku && productsBySku.length > 0) {
              productsForCategories = productsBySku as ProductCategoryRow[]
              
              // Create a map of SKU -> category for lookup
              const skuToCategoryMap = new Map<string, string>()
              productsBySku.forEach((p) => {
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
            productsForCategories.forEach((p) => {
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
        category = category || t('overview.uncategorized')
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
      const recentOrders = (recentOrdersData || []).map((order) => {
        let orderNumber: number | string | undefined = order.order_number ?? undefined
        
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
          customer_name: order.company_name || t('overview.unknown'),
          customer_email: order.email || '',
          total: Number(order.total || 0),
          status: order.status || '',
          created_at: order.created_at || '',
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
    enabled: !!tenantId && (isAdmin || !!user?.id),
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
    icon: LucideIcon
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
              <span className="text-xs text-muted-foreground ml-1">{t('overview.vsLastMonth')}</span>
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
          {t('overview.title')}
        </h1>
        <p className="text-muted-foreground">
          {t('overview.subtitle')}
        </p>
      </div>

      {/* Hero Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title={t('overview.totalRevenue')}
          value={stats ? formatCurrency(stats.totalRevenue, 'EUR') : '—'}
          subtitle={stats ? `€${stats.thisMonthRevenue.toFixed(2)} ${t('overview.thisMonth')}` : undefined}
          icon={DollarSign}
          color="text-green-500"
          change={revenueChange}
          sparkline={revenueSparkline}
        />
        <StatCard
          title={t('overview.totalOrders')}
          value={stats?.totalOrders.toString() || '—'}
          subtitle={stats ? `${stats.thisMonthOrders} ${t('overview.thisMonth')}` : undefined}
          icon={ShoppingCart}
          color="text-blue-500"
          change={ordersChange}
        />
        
        {/* Role-based card: Admin sees Active Customers, Company users see Unpaid Balance */}
        {isAdmin ? (
          <StatCard
            title={t('overview.activeCustomers')}
            value={stats?.activeCustomers.toString() || '—'}
            subtitle={t('overview.placedOrders')}
            icon={Users}
            color="text-purple-500"
          />
        ) : (
          <GlassCard hover className="relative overflow-hidden">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-muted-foreground mb-1">{t('overview.unpaidBalance')}</p>
                {isLoading || unpaidLoading ? (
                  <Skeleton className="h-10 w-32 mb-2" />
                ) : (
                  <p className="text-3xl font-bold mb-1">
                    {unpaidData ? formatCurrency(unpaidData.unpaidBalance, 'EUR') : '€0.00'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mb-2">
                  {unpaidData?.unpaidOrdersCount === 1
                    ? `1 ${t('overview.orderAwaitingPayment')}`
                    : `${unpaidData?.unpaidOrdersCount || 0} ${t('overview.ordersAwaitingPayment')}`}
                </p>
                {unpaidData && unpaidData.unpaidOrdersCount > 0 && (
                  <button
                    onClick={() => navigate(`${withBase('/dashboard/orders')}?filter=pending`)}
                    className="text-xs text-primary hover:underline flex items-center gap-1 mt-1"
                  >
                    {t('overview.viewPendingOrders')}
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
          title={t('overview.productsInCatalog')}
          value={stats?.totalProducts.toString() || '—'}
          subtitle={
            stats && stats.lowStockCount > 0
              ? `${stats.lowStockCount} ${t('overview.lowStock')}`
              : t('overview.allStocked')
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
                <h2 className="text-xl font-semibold">{t('overview.unpaidBalancesByCompany')}</h2>
                {companyUnpaidData && !companyUnpaidLoading && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t('overview.totalUnpaid')} <span className="font-semibold text-amber-500">{formatCurrency(companyUnpaidData.totalUnpaidAmount, 'EUR')}</span>
                    <span className="mx-2">•</span>
                    {companyUnpaidData.totalOrdersCount} {companyUnpaidData.totalOrdersCount === 1 ? t('orders.order') : t('orders.orders')}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => navigate(withBase('/dashboard/unpaid-balances'))}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-md hover:bg-white/5 dark:hover:bg-black/5 border border-white/10 dark:border-white/5"
            >
              {t('overview.viewAll')}
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
                      <th className="pb-3 font-medium">{t('overview.company')}</th>
                      <th className="pb-3 font-medium text-right">{t('overview.unpaidAmount')}</th>
                      <th className="pb-3 font-medium text-center">{t('overview.orders')}</th>
                      <th className="pb-3 font-medium text-right">{t('overview.lastOrder')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 dark:divide-white/5">
                    {companyUnpaidData.companies.map((company, index) => {
                      const isHighAmount = company.unpaidAmount >= 5000
                      const isMediumAmount = company.unpaidAmount >= 1000 && company.unpaidAmount < 5000
                      
                      return (
                        <tr
                          key={company.email || company.companyName || index}
                          onClick={() =>
                            navigate(
                              `${withBase('/dashboard/orders')}?company=${encodeURIComponent(company.companyName || company.email)}&filter=pending`
                            )
                          }
                          className="hover:bg-white/5 dark:hover:bg-black/5 cursor-pointer transition-colors"
                        >
                          <td className="py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                {(company.companyName || company.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{company.companyName || t('overview.unknownCompany')}</p>
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
                      onClick={() =>
                        navigate(
                          `${withBase('/dashboard/orders')}?company=${encodeURIComponent(company.companyName || company.email)}&filter=pending`
                        )
                      }
                      className="p-4 rounded-lg bg-white/5 dark:bg-black/5 hover:bg-white/10 dark:hover:bg-black/10 transition-all duration-200 border border-white/10 dark:border-white/5 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                            {(company.companyName || company.email || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{company.companyName || t('overview.unknownCompany')}</p>
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
                            <span className="text-muted-foreground text-xs">{t('unpaidBalances.unpaid')}</span>
                            <p className={`font-semibold ${isHighAmount ? 'text-red-500' : isMediumAmount ? 'text-amber-500' : 'text-foreground'}`}>
                              {formatCurrency(company.unpaidAmount, 'EUR')}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground text-xs">{t('overview.orders')}</span>
                            <p className="font-medium">{company.orderCount}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-muted-foreground text-xs">{t('overview.lastOrder')}</span>
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
              <p className="text-sm font-medium">{t('unpaidBalances.noUnpaidOrders')}</p>
              <p className="text-xs mt-1">{t('unpaidBalances.allCompaniesUpToDate')}</p>
            </div>
          )}
        </GlassCard>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">{t('overview.revenueThisMonth')}</h2>
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
              {t('overview.noRevenueDataThisMonth')}
            </div>
          )}
        </GlassCard>

        {/* Orders Chart */}
        <GlassCard>
          <h2 className="text-xl font-semibold mb-4">{t('overview.ordersLast30Days')}</h2>
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
              {t('overview.noOrdersLast30Days')}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Categories Revenue Chart - Redesigned with Better Visibility */}
      {stats?.categoriesByRevenue && stats.categoriesByRevenue.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-1">{t('overview.topCategoriesByRevenue')}</h2>
              <p className="text-sm text-muted-foreground">
                {t('overview.revenueDistributionDescription')}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3 px-5 py-3 rounded-xl bg-gradient-to-br from-white/90 via-gray-50/80 to-white/70 dark:from-gray-800/90 dark:via-gray-700/80 dark:to-gray-800/70 border border-gray-200/60 dark:border-gray-600/40 backdrop-blur-md shadow-md hover:shadow-lg hover:border-gray-300/80 dark:hover:border-gray-500/60 transition-all duration-200">
              <div className="relative">
                <div className="p-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-700 dark:to-gray-600 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                  <TrendingUp className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-gray-400 dark:bg-gray-500 rounded-full border-2 border-white dark:border-gray-800 shadow-sm" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider leading-none mb-0.5">
                  {t('overview.categoriesCount', { count: stats.categoriesByRevenue.length })}
                </span>
                <span className="text-xs font-bold text-gray-900 dark:text-gray-100">
                  {formatCurrency(
                    stats.categoriesByRevenue.reduce((sum, cat) => sum + cat.revenue, 0),
                    'EUR'
                  )} {t('overview.totalRevenueLabel')}
                </span>
              </div>
            </div>
          </div>
          {isLoading ? (
            <Skeleton className="h-96 w-full rounded-lg" />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Redesigned Donut Chart */}
              <div className="lg:col-span-2">
                <div className="relative bg-gradient-to-br from-muted/20 to-muted/5 rounded-2xl p-8 border border-border/40">
                  <ResponsiveContainer width="100%" height={340}>
                    <PieChart>
                      <defs>
                        {stats.categoriesByRevenue.map((_entry, index) => (
                          <linearGradient
                            key={`gradient-${index}`}
                            id={`gradient-${index}`}
                            x1="0"
                            y1="0"
                            x2="1"
                            y2="1"
                          >
                            <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.75} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={stats.categoriesByRevenue}
                        cx="50%"
                        cy="50%"
                        innerRadius={85}
                        outerRadius={125}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                        cornerRadius={4}
                      >
                        {stats.categoriesByRevenue.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={`url(#gradient-${index})`}
                            stroke="hsl(var(--background))"
                            strokeWidth={3}
                            style={{ 
                              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '10px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                          padding: '12px',
                          zIndex: 1000,
                        }}
                        cursor={{ fill: 'rgba(0,0,0,0.03)' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload
                            const total = stats.categoriesByRevenue.reduce((sum, cat) => sum + cat.value, 0)
                            const percent = ((data.value / total) * 100).toFixed(1)
                            const colorIndex = stats.categoriesByRevenue.findIndex(c => c.name === data.name)
                            const color = COLORS[colorIndex % COLORS.length]
                            
                            return (
                              <div className="bg-background border border-border rounded-lg shadow-lg p-3 min-w-[180px] z-50">
                                <div className="flex items-center gap-2 mb-2">
                                  <div
                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                    style={{ backgroundColor: color }}
                                  />
                                  <p className="font-semibold text-sm text-foreground truncate">{data.name}</p>
                                </div>
                                <div className="space-y-1.5">
                                  <p className="text-lg font-bold text-primary">
                                    {formatCurrency(data.revenue, 'EUR')}
                                  </p>
                                  <div className="flex items-center gap-2 pt-1.5 border-t border-border/50">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full transition-all"
                                        style={{
                                          width: `${percent}%`,
                                          backgroundColor: color,
                                        }}
                                      />
                                    </div>
                                    <span className="text-xs font-semibold text-muted-foreground min-w-[40px] text-right">
                                      {percent}%
                                    </span>
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return null
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Compact Center Label */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-muted-foreground/60 mb-1.5 uppercase tracking-wider">
                        {t('overview.totalRevenue')}
                      </p>
                      <p className="text-2xl md:text-3xl font-bold text-foreground mb-1 leading-tight">
                        {formatCurrency(
                          stats.categoriesByRevenue.reduce((sum, cat) => sum + cat.revenue, 0),
                          'EUR'
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground/50">
                        {t('overview.categoriesCount', { count: stats.categoriesByRevenue.length })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Minimalistic Category Breakdown */}
              <div className="lg:col-span-1">
                <div className="sticky top-4">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-5">
                    {t('overview.categoryBreakdown')}
                  </h3>
                  <div className="space-y-3 max-h-[340px] overflow-y-auto custom-scrollbar pr-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
                    {stats.categoriesByRevenue.map((cat, index) => {
                      const totalRevenue = stats.categoriesByRevenue.reduce((sum, c) => sum + c.revenue, 0)
                      const percentage = (cat.revenue / totalRevenue) * 100
                      const color = COLORS[index % COLORS.length]
                      
                      return (
                        <div
                          key={cat.name}
                          className="group relative p-4 rounded-2xl border border-border/30 bg-background/40 hover:bg-background/60 hover:border-border/50 transition-all duration-200"
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div
                              className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                              style={{ backgroundColor: color }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground leading-snug mb-1.5">
                                {cat.name}
                              </p>
                              <p className="text-xs text-muted-foreground/80">
                                {percentage.toFixed(1)}% {t('overview.ofTotal')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="text-base font-semibold text-foreground">
                              {formatCurrency(cat.revenue, 'EUR')}
                            </p>
                            <span className="text-xs font-medium text-muted-foreground/70">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                          {/* Minimal Progress Bar */}
                          <div className="mt-3 h-1 bg-muted/50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500 ease-out"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: color,
                                opacity: 0.7,
                              }}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
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
            <h2 className="text-xl font-semibold">{t('overview.recentOrders')}</h2>
            <button
              onClick={() => navigate(withBase('/dashboard/orders'))}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 dark:hover:bg-black/5"
            >
              {t('overview.viewAll')}
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
                      <OrderStatusBadge status={order.status} />
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
              <p className="text-sm">{t('overview.noRecentOrders')}</p>
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
              <h2 className="text-xl font-semibold">{t('overview.lowStockProducts')}</h2>
            </div>
            
            {/* Stock Status Bubbles - Real Data */}
            {stats && !isLoading && (
              <div className="flex items-center gap-2 flex-wrap">
                {/* In Stock - Green (quantity >= 10) */}
                {stats.stockStatusCounts.inStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shadow-sm hover:bg-green-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                      {t('products.inStock')}: {stats.stockStatusCounts.inStock}
                    </span>
                  </div>
                )}
                
                {/* Low Stock - Orange (1-9) */}
                {stats.stockStatusCounts.lowStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-sm hover:bg-orange-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                      {t('products.lowStock')}: {stats.stockStatusCounts.lowStock}
                    </span>
                  </div>
                )}
                
                {/* Out of Stock - Red (0) */}
                {stats.stockStatusCounts.outOfStock > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-sm hover:bg-red-500/15 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div>
                    <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                      {t('products.outOfStock')}: {stats.stockStatusCounts.outOfStock}
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
                {t('overview.productsLowOnStock', { count: stats.lowStockCount })}
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
                            {t('overview.onlyLeft', { count: product.stock })}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
              </div>
              <div className="flex justify-end pt-3 border-t border-white/10 dark:border-white/5">
                <button
                  onClick={() => navigate(`${withBase('/dashboard/products')}?filter=low-stock`)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-white/5 dark:hover:bg-black/5"
                >
                  {t('overview.viewAllProducts')}
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center gap-2.5 py-12 text-muted-foreground border border-dashed border-white/10 dark:border-white/5 rounded-lg bg-white/5 dark:bg-black/5">
              <Package className="w-4 h-4" />
              <p className="text-sm font-medium">{t('overview.allProductsSufficientStock')}</p>
            </div>
          )}
        </GlassCard>
      </div>

    </div>
  )
}
