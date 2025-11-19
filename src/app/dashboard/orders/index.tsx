import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { OrderDetailsSheet } from '@/components/OrderDetailsSheet'
import { useAuth } from '@/hooks/useAuth'
import { AdminOrdersView } from './AdminOrdersView'
import {
  Eye,
  MoreVertical,
  Plus,
  Search,
  FileText,
  Mail,
  CheckCircle,
  Copy,
  Printer,
} from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'

// Order status types matching Eastern Europe B2B style
type OrderStatus =
  | 'awaiting_payment'
  | 'partially_paid'
  | 'paid'
  | 'ready_to_ship'
  | 'shipped'

interface OrderItem {
  product_id: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  total: number
  image_url?: string
}

interface Order {
  id: number
  order_number: number
  user_id: string
  company_name: string
  email: string
  phone: string | null
  address: string | null
  notes: string | null
  items: OrderItem[]
  total: number
  deposit_amount: number | null
  deposit_paid: boolean
  status: OrderStatus
  created_at: string
  updated_at: string
}

// Dummy orders for demonstration (remove when you have real data)
// TODO: Remove DUMMY_ORDERS once you have enough real orders
const DUMMY_ORDERS: Order[] = [
  {
    id: 1,
    order_number: 1003,
    user_id: 'user-1',
    company_name: 'Sofia Furniture Ltd',
    email: 'orders@sofiafurniture.bg',
    phone: '+359 2 123 4567',
    address: '123 Vitosha Blvd, Sofia, Bulgaria',
    notes: 'Please deliver to back entrance',
    items: [
      {
        product_id: 'prod-1',
        product_name: 'Modern Office Chair',
        sku: 'CHAIR-001',
        quantity: 5,
        unit_price: 120.0,
        total: 600.0,
      },
      {
        product_id: 'prod-2',
        product_name: 'Executive Desk',
        sku: 'DESK-002',
        quantity: 2,
        unit_price: 345.0,
        total: 690.0,
      },
    ],
    total: 1290.0,
    deposit_amount: 500.0,
    deposit_paid: true,
    status: 'awaiting_payment',
    created_at: '2025-11-17T23:15:00Z',
    updated_at: '2025-11-17T23:15:00Z',
  },
  {
    id: 2,
    order_number: 1002,
    user_id: 'user-2',
    company_name: 'Bucharest Home Solutions',
    email: 'contact@bhs.ro',
    phone: '+40 21 987 6543',
    address: '45 Calea Victoriei, Bucharest, Romania',
    notes: null,
    items: [
      {
        product_id: 'prod-3',
        product_name: 'Dining Table Set',
        sku: 'TABLE-003',
        quantity: 1,
        unit_price: 850.0,
        total: 850.0,
      },
    ],
    total: 850.0,
    deposit_amount: null,
    deposit_paid: false,
    status: 'paid',
    created_at: '2025-11-15T14:30:00Z',
    updated_at: '2025-11-15T14:30:00Z',
  },
  {
    id: 3,
    order_number: 1001,
    user_id: 'user-3',
    company_name: 'Warsaw Office Supplies',
    email: 'info@wos.pl',
    phone: '+48 22 555 1234',
    address: '78 Nowy Świat, Warsaw, Poland',
    notes: 'Urgent delivery required',
    items: [
      {
        product_id: 'prod-4',
        product_name: 'Conference Table',
        sku: 'TABLE-004',
        quantity: 1,
        unit_price: 1200.0,
        total: 1200.0,
      },
      {
        product_id: 'prod-5',
        product_name: 'Ergonomic Chair',
        sku: 'CHAIR-005',
        quantity: 8,
        unit_price: 180.0,
        total: 1440.0,
      },
    ],
    total: 2640.0,
    deposit_amount: 1000.0,
    deposit_paid: true,
    status: 'ready_to_ship',
    created_at: '2025-11-10T09:20:00Z',
    updated_at: '2025-11-16T11:00:00Z',
  },
  {
    id: 4,
    order_number: 1000,
    user_id: 'user-4',
    company_name: 'Budapest Retail Group',
    email: 'orders@brg.hu',
    phone: '+36 1 234 5678',
    address: '12 Andrássy út, Budapest, Hungary',
    notes: null,
    items: [
      {
        product_id: 'prod-6',
        product_name: 'Storage Cabinet',
        sku: 'CAB-006',
        quantity: 3,
        unit_price: 250.0,
        total: 750.0,
      },
    ],
    total: 750.0,
    deposit_amount: 200.0,
    deposit_paid: true,
    status: 'partially_paid',
    created_at: '2025-11-08T16:45:00Z',
    updated_at: '2025-11-12T10:30:00Z',
  },
  {
    id: 5,
    order_number: 999,
    user_id: 'user-5',
    company_name: 'Prague Furniture Co',
    email: 'sales@pfc.cz',
    phone: '+420 2 987 6543',
    address: '56 Wenceslas Square, Prague, Czech Republic',
    notes: 'Customer will pick up',
    items: [
      {
        product_id: 'prod-7',
        product_name: 'Bookshelf Unit',
        sku: 'SHELF-007',
        quantity: 4,
        unit_price: 150.0,
        total: 600.0,
      },
    ],
    total: 600.0,
    deposit_amount: null,
    deposit_paid: false,
    status: 'shipped',
    created_at: '2025-11-05T11:00:00Z',
    updated_at: '2025-11-18T08:00:00Z',
  },
]

function getStatusBadge(status: OrderStatus) {
  const configs = {
    awaiting_payment: {
      label: 'Awaiting Payment',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    partially_paid: {
      label: 'Partially Paid',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    paid: {
      label: 'Paid',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    ready_to_ship: {
      label: 'Ready to Ship',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    shipped: {
      label: 'Shipped',
      className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
    },
  }

  const config = configs[status]
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

function formatOrderDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

export function OrdersPage() {
  const { user, isAdmin } = useAuth()
  
  // Admin sees completely different view
  if (isAdmin) {
    return <AdminOrdersView />
  }

  // Company users see the original orders view
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrders, setSelectedOrders] = useState<Set<number>>(new Set())
  const [quickFilter, setQuickFilter] = useState<string | null>(null)
  const navigate = useNavigate()

  const isDevMode = import.meta.env.VITE_DEV_MODE === 'true'
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const isDemoMode = supabaseUrl.includes('placeholder')
  // Use the same dev user ID as in useAuth hook
  const devUserId = (isDevMode || isDemoMode) ? '00000000-0000-0000-0000-000000000123' : null
  const userId = user?.id || devUserId

  // Fetch real orders from quotes table (Eastern Europe B2B style: quotes are orders)
  const { data: quotesData, isLoading } = useQuery({
    queryKey: ['orders', userId, isDevMode || isDemoMode],
    queryFn: async () => {
      // In dev/demo mode, show all orders. In production, filter by user_id
      let query = supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      // Only filter by user_id in production mode
      if (!isDevMode && !isDemoMode && userId) {
        query = query.eq('user_id', userId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching orders:', error)
        throw error
      }

      // Map quotes to orders format
      return (data || []).map((quote: any) => {
        // Map old status values to new status system
        const statusMap: Record<string, OrderStatus> = {
          new: 'awaiting_payment',
          pending: 'awaiting_payment',
          approved: 'paid',
          rejected: 'awaiting_payment', // Treat rejected as awaiting payment
          expired: 'awaiting_payment',
        }

        // Default status if not in map
        const mappedStatus = statusMap[quote.status] || 'awaiting_payment'

        return {
          id: typeof quote.id === 'number' ? quote.id : parseInt(quote.id) || 0,
          order_number: quote.order_number || (typeof quote.id === 'number' ? quote.id : parseInt(quote.id) || 0),
          user_id: quote.user_id,
          company_name: quote.company_name || 'Unknown Company',
          email: quote.email || '',
          phone: quote.phone || null,
          address: null, // Address not stored in quotes table yet
          notes: quote.notes || null,
          items: Array.isArray(quote.items) ? quote.items : [],
          total: parseFloat(quote.total) || 0,
          deposit_amount: null, // Deposit not stored yet - can be added later
          deposit_paid: false, // Default to false
          status: mappedStatus,
          created_at: quote.created_at,
          updated_at: quote.updated_at || quote.created_at,
        } as Order
      })
    },
    enabled: !!userId,
  })

  // Combine real orders with dummy data for demonstration (remove DUMMY_ORDERS later)
  const orders = quotesData || []

  // Auto-open order details if coming from order submission
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const newOrderId = urlParams.get('newOrder')
    if (newOrderId && orders && orders.length > 0) {
      // Try to find by order_number first, then by id
      const newOrder = orders.find(
        (o) =>
          o.order_number?.toString() === newOrderId ||
          o.id.toString() === newOrderId
      )
      if (newOrder) {
        setSelectedOrder(newOrder)
        setDetailsOpen(true)
        // Clean up URL
        window.history.replaceState({}, '', '/dashboard/orders')
      }
    }
  }, [orders])

  // Filter and search orders
  const filteredOrders = useMemo(() => {
    let filtered = orders

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_number.toString().includes(query) ||
          order.company_name.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Quick filters
    if (quickFilter === 'no_deposit') {
      filtered = filtered.filter((order) => !order.deposit_paid)
    } else if (quickFilter === 'ready_today') {
      filtered = filtered.filter((order) => order.status === 'ready_to_ship')
    } else if (quickFilter === 'low_stock') {
      // TODO: Implement low stock logic based on inventory
      filtered = filtered.filter((order) => order.id === 3) // Dummy filter
    }

    return filtered
  }, [orders, searchQuery, statusFilter, quickFilter])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrders(new Set(filteredOrders.map((o) => o.id)))
    } else {
      setSelectedOrders(new Set())
    }
  }

  const handleSelectOrder = (orderId: number, checked: boolean) => {
    const newSelected = new Set(selectedOrders)
    if (checked) {
      newSelected.add(orderId)
    } else {
      newSelected.delete(orderId)
    }
    setSelectedOrders(newSelected)
  }

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action}`, Array.from(selectedOrders))
    // TODO: Implement bulk actions
    setSelectedOrders(new Set())
  }

  const handleOrderAction = (order: Order, action: string) => {
    console.log(`Order action: ${action}`, order)
    // TODO: Implement order actions
    switch (action) {
      case 'duplicate':
        // TODO: Duplicate order logic
        break
      case 'proforma':
        // TODO: Generate proforma invoice
        break
      case 'mark_paid':
        // TODO: Mark as paid
        break
      case 'send_email':
        // TODO: Send email
        break
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold">Orders</h1>
        <p className="text-muted-foreground mt-1">
          View and manage all customer orders
        </p>
      </div>

      {/* Top Bar: Search, Filters, Quick Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or buyer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="ready_to_ship">Ready to Ship</SelectItem>
              <SelectItem value="shipped">Shipped</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Filter Chips */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={quickFilter === 'no_deposit' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setQuickFilter(quickFilter === 'no_deposit' ? null : 'no_deposit')
            }
            className={cn(
              quickFilter === 'no_deposit' &&
                'bg-orange-500 text-white hover:bg-orange-600'
            )}
          >
            No Deposit
          </Button>
          <Button
            variant={quickFilter === 'ready_today' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setQuickFilter(quickFilter === 'ready_today' ? null : 'ready_today')
            }
            className={cn(
              quickFilter === 'ready_today' &&
                'bg-blue-500 text-white hover:bg-blue-600'
            )}
          >
            Ready Today
          </Button>
          <Button
            variant={quickFilter === 'low_stock' ? 'default' : 'outline'}
            size="sm"
            onClick={() =>
              setQuickFilter(quickFilter === 'low_stock' ? null : 'low_stock')
            }
            className={cn(
              quickFilter === 'low_stock' &&
                'bg-red-500 text-white hover:bg-red-600'
            )}
          >
            Low Stock Items
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedOrders.size > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''}{' '}
              selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('mark_paid')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('proforma')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Proforma (PDF)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('send_email')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send Email
            </Button>
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={
                    filteredOrders.length > 0 &&
                    selectedOrders.size === filteredOrders.length
                  }
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Order No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Buyer</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  Loading orders...
                </TableCell>
              </TableRow>
            ) : filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-muted-foreground">No orders found</p>
                    {searchQuery || statusFilter !== 'all' || quickFilter ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('')
                          setStatusFilter('all')
                          setQuickFilter(null)
                        }}
                      >
                        Clear filters
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => {
                    setSelectedOrder(order)
                    setDetailsOpen(true)
                  }}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedOrders.has(order.id)}
                      onCheckedChange={(checked) =>
                        handleSelectOrder(order.id, checked as boolean)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-mono font-semibold text-primary">
                      #{order.order_number}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatOrderDate(order.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.company_name}</div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {order.items.length} item{order.items.length > 1 ? 's' : ''}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{formatPrice(order.total)}</span>
                  </TableCell>
                  <TableCell>
                    {order.deposit_paid && order.deposit_amount ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">
                        Yes {formatPrice(order.deposit_amount)}
                      </span>
                    ) : (
                      <span className="text-orange-600 dark:text-orange-400 font-medium">
                        No
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => {
                          setSelectedOrder(order)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleOrderAction(order, 'duplicate')}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate as New Order
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOrderAction(order, 'proforma')}
                          >
                            <FileText className="w-4 h-4 mr-2" />
                            Generate Proforma Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleOrderAction(order, 'mark_paid')}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Paid
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleOrderAction(order, 'send_email')}
                          >
                            <Mail className="w-4 h-4 mr-2" />
                            Send by Email
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Order Details Sheet */}
      {selectedOrder && (
        <OrderDetailsSheet
          order={selectedOrder}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
        />
      )}

      {/* Floating Action Button */}
      <Button
        size="lg"
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
        onClick={() => {
          // TODO: Open new order dialog
          console.log('New order clicked')
        }}
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">New Order</span>
      </Button>
    </div>
  )
}
