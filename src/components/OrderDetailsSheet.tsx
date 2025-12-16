import { useState } from 'react'
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
  Mail,
  Copy,
  Printer,
  Building2,
  Phone,
  MapPin,
  Warehouse,
  Truck,
  Package,
  Store,
  Loader2,
  Download,
} from 'lucide-react'
import { SHIPPING_METHOD_CONFIG } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { pdf } from '@react-pdf/renderer'
import { ProformaInvoicePDF, type ProformaInvoicePDFProps } from './ProformaInvoicePDF'
import { supabase } from '@/lib/supabase/client'
import { Company } from '@/types'

// Order status types - new simplified workflow
type OrderStatus =
  | 'processing'
  | 'awaiting_payment'
  | 'shipped'
  | 'completed'

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
  shipping_method?: 'warehouse_pickup' | 'transport_company' | 'dropshipping' | 'shop_delivery'
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

function getStatusBadge(status: OrderStatus | string) {
  const configs: Record<string, { label: string; className: string }> = {
    processing: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    awaiting_payment: {
      label: 'Awaiting Payment',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    shipped: {
      label: 'Shipped',
      className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    },
    completed: {
      label: 'Completed & Sent',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    // Legacy status fallbacks (for backwards compatibility)
    new: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    pending: {
      label: 'Awaiting Payment',
      className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    },
    approved: {
      label: 'Completed & Sent',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
  }

  const config = configs[status] || {
    label: status || 'Unknown',
    className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
  }
  
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
  const { company, profile } = useAuth()
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  // Check if current user is a company user (not admin)
  const isCompanyUser = profile?.role === 'company'

  // Generate and download proforma invoice PDF
  // Only available for company users - PDF shows:
  // - Доставчик (Supplier) = Admin's company (the platform/seller)
  // - Получател (Buyer) = Logged-in company user's company
  const handleGenerateProforma = async () => {
    if (!company || !isCompanyUser) {
      console.error('PDF generation only available for company users')
      return
    }

    setIsGeneratingPdf(true)

    try {
      // Helper: parse city from address if not stored separately
      const parseCityFromAddress = (address: string | undefined | null): string | undefined => {
        if (!address) return undefined
        const parts = address.split(',').map(p => p.trim())
        if (parts.length >= 2) {
          return parts[parts.length - 2] || parts[parts.length - 1]
        }
        return parts[0] || undefined
      }

      // Fetch ADMIN's company data (Доставчик/Supplier - the platform owner)
      // Find admin profile first, then get their company
      const { data: adminProfile, error: adminProfileError } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('role', 'admin')
        .single()

      if (adminProfileError) {
        console.error('Could not find admin profile:', adminProfileError)
      }

      let adminCompany: Company | null = null
      if (adminProfile?.company_id) {
        const { data: adminCompanyData, error: adminCompanyError } = await supabase
          .from('companies')
          .select('*')
          .eq('id', adminProfile.company_id)
          .single()

        if (adminCompanyError) {
          console.error('Could not fetch admin company:', adminCompanyError)
        }

        if (adminCompanyData) {
          adminCompany = adminCompanyData as Company
          console.log('Admin company (Доставчик) loaded:', adminCompany)
        }
      }

      // Refresh logged-in company's data (Получател/Buyer - the current company user)
      const { data: freshCompany, error: companyRefreshError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', company.id)
        .single()

      if (companyRefreshError) {
        console.error('Could not refresh company data:', companyRefreshError)
      }

      const buyerCompany = (freshCompany as Company) || company
      console.log('Buyer company (Получател) loaded:', buyerCompany)

      // Доставчик (Supplier) = Admin's company (the platform/seller)
      const supplierCity = adminCompany?.city || parseCityFromAddress(adminCompany?.address)
      const supplier: ProformaInvoicePDFProps['supplier'] = {
        name: adminCompany?.name || '—',
        address: adminCompany?.address || '',
        city: supplierCity,
        phone: adminCompany?.phone,
        eik: adminCompany?.eik_bulstat,
        vatNumber: adminCompany?.vat_number,
        mol: adminCompany?.mol,
        bankName: adminCompany?.bank_name,
        iban: adminCompany?.iban,
        bic: adminCompany?.bic,
      }

      // Получател (Buyer) = Logged-in company user's company
      const buyerCity = buyerCompany.city || parseCityFromAddress(buyerCompany.address)
      const buyer: ProformaInvoicePDFProps['buyer'] = {
        companyName: buyerCompany.name || order.company_name,
        eik: buyerCompany.eik_bulstat,
        vatNumber: buyerCompany.vat_number,
        city: buyerCity,
        address: buyerCompany.address || order.address || undefined,
        email: order.email,
        phone: buyerCompany.phone || order.phone || undefined,
        mol: buyerCompany.mol,
      }

      console.log('Supplier for PDF:', supplier)
      console.log('Buyer for PDF:', buyer)

      // Map order items to the expected format
      const mappedOrder = {
        ...order,
        items: order.items.map(item => ({
          ...item,
          product_id: item.product_id,
        })),
      }

      // Generate PDF blob
      const blob = await pdf(
        <ProformaInvoicePDF
          order={mappedOrder}
          supplier={supplier}
          buyer={buyer}
          settings={{
            currency: 'EUR',
            // Bulgarian VAT is fixed at 20%
            vatRate: 0.2,
          }}
        />
      ).toBlob()

      // Create download link and trigger download
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `proforma-${order.order_number}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error generating proforma PDF:', error)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const handleAction = (action: string) => {
    console.log(`Order action: ${action}`, order)
    switch (action) {
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

          {/* Shipping Method */}
          <div className="bg-card border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Shipping Method</h3>
            {(() => {
              const method = order.shipping_method || 'shop_delivery'
              const config = SHIPPING_METHOD_CONFIG[method] || SHIPPING_METHOD_CONFIG.shop_delivery
              const IconComponent = method === 'warehouse_pickup' ? Warehouse 
                : method === 'transport_company' ? Truck 
                : method === 'dropshipping' ? Package 
                : Store
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
              }
              const colorClass = colorClasses[config.color as keyof typeof colorClasses] || colorClasses.green
              
              return (
                <div className="flex items-center gap-4">
                  <div className={`flex items-center justify-center w-16 h-16 rounded-full ${colorClass.split(' ').slice(0, 2).join(' ')}`}>
                    <IconComponent className={`h-8 w-8 ${colorClass.split(' ').slice(2).join(' ')}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{config.shortLabel}</p>
                    <p className={`text-lg font-bold ${colorClass.split(' ').slice(2).join(' ')}`}>
                      {config.label}
                    </p>
                  </div>
                </div>
              )
            })()}
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
            <h3 className="text-lg font-semibold mb-4">Order Total</h3>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-primary">
                {formatPrice(order.total)}
              </span>
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
            {/* Proforma Invoice - Only visible for company users */}
            {isCompanyUser && (
              <Button
                variant="default"
                className="w-full sm:col-span-2"
                onClick={handleGenerateProforma}
                disabled={isGeneratingPdf || !company}
              >
                {isGeneratingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генериране...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Проформа фактура (PDF)
                  </>
                )}
              </Button>
            )}
            {/* Other actions - visible for all users */}
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
