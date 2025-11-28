import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Eye, Search, FileText, Download, Building2, X, Warehouse, Truck, Package, Store } from 'lucide-react'
import { ShippingMethod, SHIPPING_METHOD_CONFIG } from '@/types'
import { ShippingMethodBadge } from '@/components/ShippingMethodBadge'
import { formatPrice, formatDateTime, cn } from '@/lib/utils'
import { ProformaInvoicePDF } from '@/components/ProformaInvoicePDF'
import { pdf } from '@react-pdf/renderer'

interface OrderItem {
  product_id?: string
  product_name: string
  sku: string
  quantity: number
  unit_price: number
  total: number
  image_url?: string
}

interface Order {
  id: number | string
  order_number: number
  user_id: string
  company_name: string
  email: string
  phone: string | null
  address: string | null
  notes: string | null
  internal_notes?: string
  items: OrderItem[]
  total: number
  shipping_method: 'warehouse_pickup' | 'transport_company' | 'dropshipping' | 'shop_delivery'
  status: 'processing' | 'awaiting_payment' | 'shipped' | 'completed'
  created_at: string
  updated_at: string
}

// Map old database status values to new UI statuses
function mapStatus(status: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    // Legacy DB values
    new: 'processing',
    draft: 'processing',
    pending: 'awaiting_payment',
    approved: 'completed',
    paid: 'completed',
    delivered: 'completed',
    // Current UI statuses
    processing: 'processing',
    awaiting_payment: 'awaiting_payment',
    shipped: 'shipped',
    completed: 'completed',
    // Edge cases
    rejected: 'awaiting_payment',
    expired: 'awaiting_payment',
    partially_paid: 'awaiting_payment',
    ready_to_ship: 'shipped',
  }
  return statusMap[status] || 'processing'
}

// Map new UI statuses to database values
function mapStatusToDb(status: Order['status']): string {
  const statusMap: Record<Order['status'], string> = {
    processing: 'new',
    awaiting_payment: 'pending',
    shipped: 'shipped',
    completed: 'approved',
  }
  return statusMap[status]
}

// Status badge function removed - using OrderStatusBadge component instead

function formatOrderDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

function isToday(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

function isThisWeek(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  const weekAgo = new Date(today)
  weekAgo.setDate(today.getDate() - 7)
  return date >= weekAgo
}

export function AdminOrdersView() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const [quickFilter, setQuickFilter] = useState<string | null>(null)
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Handle URL query parameters for filtering
  useEffect(() => {
    const companyParam = searchParams.get('company')
    const filterParam = searchParams.get('filter')
    
    if (companyParam) {
      setCompanyFilter(companyParam)
    }
    if (filterParam === 'pending') {
      // Show both processing and awaiting_payment for "pending" filter
      setStatusFilter('awaiting_payment')
    } else if (filterParam === 'processing') {
      setStatusFilter('processing')
    }
  }, [searchParams])

  // Fetch all orders (admin sees all via RLS)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching orders:', error)
        throw error
      }

      // Fetch company names for each order
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (quote: any) => {
          let companyName = quote.company_name || 'Unknown Company'

          // Try to get company name from profile if not in quote
          if (!companyName && quote.user_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('company_name')
              .eq('id', quote.user_id)
              .single()

            if (profile?.company_name) {
              companyName = profile.company_name
            }
          }

          return {
            id: typeof quote.id === 'number' ? quote.id : parseInt(quote.id) || 0,
            order_number: quote.order_number || (typeof quote.id === 'number' ? quote.id : parseInt(quote.id) || 0),
            user_id: quote.user_id,
            company_name: companyName,
            email: quote.email || '',
            phone: quote.phone || null,
            address: null,
            notes: quote.notes || null,
            internal_notes: quote.internal_notes || '',
            items: Array.isArray(quote.items) ? quote.items : [],
            total: parseFloat(quote.total) || 0,
            shipping_method: quote.shipping_method || 'shop_delivery',
            status: mapStatus(quote.status),
            created_at: quote.created_at,
            updated_at: quote.updated_at || quote.created_at,
          } as Order
        })
      )

      return ordersWithDetails
    },
  })

  // Set up real-time subscription for orders
  useEffect(() => {
    const channel = supabase
      .channel('admin-orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quotes',
        },
        () => {
          // Refetch orders when any change occurs
          queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number | string; status: Order['status'] }) => {
      const dbStatus = mapStatusToDb(status)
      const { error } = await supabase
        .from('quotes')
        .update({ status: dbStatus })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      toast({
        title: 'Status updated',
        description: 'The order status has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message || 'Failed to update order status.',
        variant: 'destructive',
      })
    },
  })

  // Update internal notes mutation
  const updateInternalNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: number | string; notes: string }) => {
      const { error } = await supabase
        .from('quotes')
        .update({ internal_notes: notes })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] })
      toast({
        title: 'Notes updated',
        description: 'Internal notes have been saved.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating notes',
        description: error.message || 'Failed to update internal notes.',
        variant: 'destructive',
      })
    },
  })

  // Extract unique company names for filter dropdown
  const uniqueCompanies = useMemo(() => {
    if (!orders) return []
    const companies = new Set<string>()
    orders.forEach((order) => {
      if (order.company_name && order.company_name !== 'Unknown Company') {
        companies.add(order.company_name)
      }
    })
    return Array.from(companies).sort((a, b) => a.localeCompare(b))
  }, [orders])

  // Filter orders
  const filteredOrders = useMemo(() => {
    let filtered = orders || []

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (order) =>
          order.order_number.toString().includes(query) ||
          order.company_name.toLowerCase().includes(query) ||
          order.email.toLowerCase().includes(query)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((order) => order.status === statusFilter)
    }

    // Company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter(
        (order) => 
          order.company_name === companyFilter || 
          order.email === companyFilter
      )
    }

    // Quick filters
    if (quickFilter === 'today') {
      filtered = filtered.filter((order) => isToday(order.created_at))
    } else if (quickFilter === 'this_week') {
      filtered = filtered.filter((order) => isThisWeek(order.created_at))
    }

    return filtered
  }, [orders, searchQuery, statusFilter, companyFilter, quickFilter])

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
  }

  const handleStatusChange = (orderId: number | string, newStatus: Order['status']) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus })
  }

  const handleInternalNotesChange = (notes: string) => {
    if (!selectedOrder) return
    updateInternalNotesMutation.mutate({ id: selectedOrder.id, notes })
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">All Customer Orders</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all customer orders
          </p>
        </div>

        {/* Top Bar: Search and Filters */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order number, company name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Company Filter */}
            <div className="relative">
              <Select 
                value={companyFilter} 
                onValueChange={(value) => {
                  setCompanyFilter(value)
                  // Clear URL params when manually changing filter
                  if (searchParams.has('company')) {
                    searchParams.delete('company')
                    setSearchParams(searchParams)
                  }
                }}
              >
                <SelectTrigger className="w-full sm:w-[220px]">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="All Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {uniqueCompanies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {companyFilter !== 'all' && (
                <button
                  onClick={() => {
                    setCompanyFilter('all')
                    if (searchParams.has('company')) {
                      searchParams.delete('company')
                      setSearchParams(searchParams)
                    }
                  }}
                  className="absolute right-8 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded-full"
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="completed">Completed & Sent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Quick Filter Chips */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={quickFilter === 'today' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setQuickFilter(quickFilter === 'today' ? null : 'today')
              }
              className={cn(
                quickFilter === 'today' &&
                  'bg-gray-700 text-white hover:bg-gray-800'
              )}
            >
              Today
            </Button>
            <Button
              variant={quickFilter === 'this_week' ? 'default' : 'outline'}
              size="sm"
              onClick={() =>
                setQuickFilter(quickFilter === 'this_week' ? null : 'this_week')
              }
              className={cn(
                quickFilter === 'this_week' &&
                  'bg-gray-700 text-white hover:bg-gray-800'
              )}
            >
              This Week
            </Button>
            
            {/* Status Filter Buttons - New Workflow */}
            <Button
              variant={statusFilter === 'processing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === 'processing' ? 'all' : 'processing')}
              className={cn(
                statusFilter === 'processing' &&
                  'bg-blue-500 text-white hover:bg-blue-600'
              )}
            >
              Processing
            </Button>
            <Button
              variant={statusFilter === 'awaiting_payment' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === 'awaiting_payment' ? 'all' : 'awaiting_payment')}
              className={cn(
                statusFilter === 'awaiting_payment' &&
                  'bg-orange-500 text-white hover:bg-orange-600'
              )}
            >
              Awaiting Payment
            </Button>
            <Button
              variant={statusFilter === 'shipped' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === 'shipped' ? 'all' : 'shipped')}
              className={cn(
                statusFilter === 'shipped' &&
                  'bg-purple-500 text-white hover:bg-purple-600'
              )}
            >
              Shipped
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
              className={cn(
                statusFilter === 'completed' &&
                  'bg-green-500 text-white hover:bg-green-600'
              )}
            >
              Completed & Sent
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Shipping</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading orders...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No orders found</p>
                      {searchQuery || statusFilter !== 'all' || companyFilter !== 'all' || quickFilter ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setStatusFilter('all')
                            setCompanyFilter('all')
                            setQuickFilter(null)
                            // Clear URL params
                            if (searchParams.has('company') || searchParams.has('filter')) {
                              searchParams.delete('company')
                              searchParams.delete('filter')
                              setSearchParams(searchParams)
                            }
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
                  <TableRow key={order.id}>
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
                      <ShippingMethodBadge method={order.shipping_method} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value as Order['status'])
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="processing">Processing</SelectItem>
                          <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                          <SelectItem value="shipped">Shipped</SelectItem>
                          <SelectItem value="completed">Completed & Sent</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Order #{selectedOrder.order_number}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status and Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Select
                      value={selectedOrder.status}
                      onValueChange={(value) => {
                        const updated = { ...selectedOrder, status: value as Order['status'] }
                        setSelectedOrder(updated)
                        handleStatusChange(selectedOrder.id, value as Order['status'])
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="awaiting_payment">Awaiting Payment</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="completed">Completed & Sent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Order Number</p>
                    <p className="font-mono text-sm font-semibold">
                      #{selectedOrder.order_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                    <p className="text-sm font-medium">{selectedOrder.company_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{formatDateTime(selectedOrder.created_at)}</p>
                  </div>
                </div>

                {/* Shipping Method */}
                <div className="p-4 rounded-lg bg-muted/50 border">
                  <p className="text-sm text-muted-foreground mb-2">Shipping Method</p>
                  <div className="flex items-center gap-3">
                    <ShippingMethodBadge method={selectedOrder.shipping_method} size="md" />
                    <span className="text-sm text-muted-foreground">
                      {SHIPPING_METHOD_CONFIG[selectedOrder.shipping_method || 'shop_delivery']?.label}
                    </span>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{selectedOrder.email}</p>
                  </div>
                  {selectedOrder.phone && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Phone</p>
                      <p className="text-sm">{selectedOrder.phone}</p>
                    </div>
                  )}
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Items</p>
                    <div className="space-y-2">
                      {selectedOrder.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {formatPrice(item.unit_price)} × {item.quantity}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{formatPrice(item.total)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-lg font-semibold">Total</p>
                  <p className="text-lg font-bold">{formatPrice(selectedOrder.total)}</p>
                </div>

                {/* Customer Notes */}
                {selectedOrder.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Customer Notes</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedOrder.notes}</p>
                  </div>
                )}

                {/* Internal Notes (Admin Only) */}
                <div>
                  <Label htmlFor="internal-notes">Internal Notes</Label>
                  <Textarea
                    id="internal-notes"
                    value={selectedOrder.internal_notes || ''}
                    onChange={(e) => {
                      const updated = { ...selectedOrder, internal_notes: e.target.value }
                      setSelectedOrder(updated)
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== (selectedOrder.internal_notes || '')) {
                        handleInternalNotesChange(e.target.value)
                      }
                    }}
                    placeholder="Add internal notes about this order (only visible to admins)..."
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes are only visible to admins and will not be shown to the customer.
                  </p>
                </div>

                {/* PDF Generation Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={async () => {
                      try {
                        const blob = await pdf(
                          <ProformaInvoicePDF order={selectedOrder} />
                        ).toBlob()
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `Proforma_Order_${selectedOrder.order_number}.pdf`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        URL.revokeObjectURL(url)
                        toast({
                          title: 'Proforma Invoice Generated',
                          description: 'The proforma invoice has been downloaded successfully.',
                        })
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to generate proforma invoice.'
                        toast({
                          title: 'Error',
                          description: errorMessage,
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="flex-1"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Generate Proforma Invoice
                  </Button>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        const blob = await pdf(
                          <ProformaInvoicePDF order={selectedOrder} />
                        ).toBlob()
                        const url = URL.createObjectURL(blob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = `Order_${selectedOrder.order_number}_Summary.pdf`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        URL.revokeObjectURL(url)
                        toast({
                          title: 'Order Summary Downloaded',
                          description: 'The order summary PDF has been downloaded successfully.',
                        })
                      } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to generate order summary.'
                        toast({
                          title: 'Error',
                          description: errorMessage,
                          variant: 'destructive',
                        })
                      }
                    }}
                    className="flex-1"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download as PDF
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

