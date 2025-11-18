import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPrice } from '@/lib/utils'
import { cn } from '@/lib/utils'
import {
  FileText,
  Mail,
  CheckCircle,
  Copy,
  Printer,
  Building2,
  Phone,
  MapPin,
} from 'lucide-react'

// Order status types
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

interface OrderDetailsSheetProps {
  order: Order
  open: boolean
  onOpenChange: (open: boolean) => void
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
    <Badge variant="outline" className={cn('font-medium text-base px-3 py-1', config.className)}>
      {config.label}
    </Badge>
  )
}

export function OrderDetailsSheet({
  order,
  open,
  onOpenChange,
}: OrderDetailsSheetProps) {
  const amountDue = order.total - (order.deposit_amount || 0)

  const handleAction = (action: string) => {
    console.log(`Order action: ${action}`, order)
    // TODO: Implement actions
    switch (action) {
      case 'proforma':
        // TODO: Generate proforma invoice PDF
        break
      case 'mark_paid':
        // TODO: Mark order as paid
        break
      case 'duplicate':
        // TODO: Duplicate order
        break
      case 'send_email':
        // TODO: Send email
        break
      case 'print_packing':
        // TODO: Print packing list
        window.print()
        break
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
        <SheetHeader className="pb-6 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-2xl font-bold">
              Order #{order.order_number}
            </SheetTitle>
            {getStatusBadge(order.status)}
          </div>
          <SheetDescription className="text-base">
            {formatOrderDate(order.created_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Buyer Card */}
          <div className="bg-card border rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <h3 className="text-lg font-semibold">Buyer Information</h3>
            </div>
            <div className="space-y-3">
              <div>
                <span className="text-sm text-muted-foreground">Company:</span>
                <p className="font-medium text-base">{order.company_name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Email:</span>
                <p className="font-medium text-base">{order.email}</p>
              </div>
              {order.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <p className="font-medium text-base">{order.phone}</p>
                </div>
              )}
              {order.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-sm text-muted-foreground">Address:</span>
                    <p className="font-medium text-base">{order.address}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Deposit Status */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Deposit Status</h3>
            {order.deposit_paid && order.deposit_amount ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Deposit Paid</p>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatPrice(order.deposit_amount)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30">
                  <span className="text-2xl">✕</span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">No Deposit Paid</p>
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {formatPrice(0)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Order Items Table */}
          <div className="bg-card border rounded-lg overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-semibold">Order Items</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Image</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Product Name</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="w-16 h-16 rounded border bg-muted flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.product_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">📦</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.sku}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{item.product_name}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-medium">{item.quantity}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-muted-foreground">
                        {formatPrice(item.unit_price)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold">{formatPrice(item.total)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Totals Section */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Order Totals</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-base">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatPrice(order.total)}</span>
              </div>
              {order.deposit_paid && order.deposit_amount && (
                <div className="flex items-center justify-between text-base">
                  <span className="text-muted-foreground">Deposit Paid</span>
                  <span className="font-medium text-green-600 dark:text-green-400">
                    -{formatPrice(order.deposit_amount)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex items-center justify-between">
                <span className="text-lg font-bold">Amount Due</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(amountDue)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-card border rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {order.notes}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t">
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleAction('proforma')}
            >
              <FileText className="w-4 h-4 mr-2" />
              Generate Proforma Invoice
            </Button>
            <Button
              variant="default"
              className="w-full"
              onClick={() => handleAction('mark_paid')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleAction('duplicate')}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicate as New Order
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => handleAction('send_email')}
            >
              <Mail className="w-4 h-4 mr-2" />
              Send by Email
            </Button>
            <Button
              variant="outline"
              className="w-full sm:col-span-2"
              onClick={() => handleAction('print_packing')}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Packing List
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
