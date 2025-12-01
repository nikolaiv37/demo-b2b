import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
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
import { useAuth } from '@/hooks/useAuth'
import { Eye, AlertCircle, Image as ImageIcon } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ComplaintItem {
  sku: string
  name: string
  quantity: number
}

interface Complaint {
  id: string
  order_id: string
  order_number?: number
  status: 'pending' | 'in-review' | 'approved' | 'rejected'
  items: ComplaintItem[]
  photos: string[]
  reason: string
  message: string
  created_at: string
  updated_at: string
}

function getStatusBadge(status: Complaint['status'], t: (key: string) => string) {
  const configs = {
    pending: {
      label: t('complaints.pending'),
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    },
    'in-review': {
      label: t('complaints.inReview'),
      className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    },
    approved: {
      label: t('complaints.approved'),
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    },
    rejected: {
      label: t('complaints.rejected'),
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  }

  const config = configs[status]
  return (
    <Badge variant="outline" className={cn('font-medium', config.className)}>
      {config.label}
    </Badge>
  )
}

function getReasonLabel(reason: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    damaged_transport: t('complaints.damagedTransport'),
    wrong_product: t('complaints.wrongProduct'),
    missing_parts: t('complaints.missingParts'),
    defective: t('complaints.defective'),
    other: t('complaints.other'),
  }
  return labels[reason] || reason
}

export function MyComplaintsTab() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const { data: complaints, isLoading } = useQuery({
    queryKey: ['complaints', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        // If table doesn't exist, return empty array
        if (error.code === '42P01') {
          return []
        }
        throw error
      }

      // Fetch order numbers for each complaint
      // Skip orders table entirely - use quotes table directly (this is the orders table in this system)
      const complaintsWithOrders = await Promise.all(
        (data || []).map(async (complaint: any) => {
          let orderNumber = null

          // Try quotes table directly (this is where orders are stored)
          const { data: quote, error: quoteError } = await supabase
            .from('quotes')
            .select('order_number')
            .eq('id', complaint.order_id)
            .single()

          // Only use quote if no error (or if error is not "table not found")
          if (!quoteError || (quoteError.code !== 'PGRST205' && !quoteError.message?.includes('Could not find the table'))) {
            if (quote?.order_number) {
              orderNumber = quote.order_number
            }
          }

          return {
            ...complaint,
            order_number: orderNumber,
          } as Complaint
        })
      )

      return complaintsWithOrders
    },
    enabled: !!user?.id,
  })

  const handleViewComplaint = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setDialogOpen(true)
  }

  if (isLoading) {
    return (
      <GlassCard className="p-6">
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </GlassCard>
    )
  }

  if (!complaints || complaints.length === 0) {
    return (
      <GlassCard className="p-12">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold mb-2">{t('complaints.noComplaints')}</h3>
          <p className="text-muted-foreground">
            {t('complaints.noComplaintsDescription')}
          </p>
        </div>
      </GlassCard>
    )
  }

  return (
    <>
      <GlassCard className="p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('complaints.orderNumber')}</TableHead>
                <TableHead>{t('complaints.date')}</TableHead>
                <TableHead>{t('complaints.orderId')}</TableHead>
                <TableHead>{t('complaints.status')}</TableHead>
                <TableHead>{t('complaints.items')}</TableHead>
                <TableHead>{t('complaints.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {complaints.map((complaint) => (
                <TableRow key={complaint.id}>
                  <TableCell className="font-mono text-sm">
                    #{complaint.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{formatDate(complaint.created_at)}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {complaint.order_number
                      ? `#${complaint.order_number}`
                      : complaint.order_id.slice(0, 8)}
                  </TableCell>
                  <TableCell>{getStatusBadge(complaint.status, t)}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {complaint.items?.length || 0} {t('products.items')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewComplaint(complaint)}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('complaints.view')}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </GlassCard>

      {/* Complaint Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Complaint #{selectedComplaint.id.slice(0, 8)}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Status and Order Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    {getStatusBadge(selectedComplaint.status, t)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Order ID</p>
                    <p className="font-mono text-sm">
                      {selectedComplaint.order_number
                        ? `#${selectedComplaint.order_number}`
                        : selectedComplaint.order_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{formatDate(selectedComplaint.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                    <p className="text-sm">{formatDate(selectedComplaint.updated_at)}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="font-medium">{getReasonLabel(selectedComplaint.reason, t)}</p>
                </div>

                {/* Items */}
                {selectedComplaint.items && selectedComplaint.items.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Items</p>
                    <div className="space-y-2">
                      {selectedComplaint.items.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-muted rounded"
                        >
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-muted-foreground font-mono">
                              SKU: {item.sku}
                            </p>
                          </div>
                          <Badge variant="secondary">Qty: {item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedComplaint.message && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('complaints.description')}</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedComplaint.message}</p>
                  </div>
                )}

                {/* Photos */}
                {selectedComplaint.photos && selectedComplaint.photos.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('complaints.photos')}</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {selectedComplaint.photos.map((photo, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={photo}
                            alt={`Complaint photo ${index + 1}`}
                            className="w-full h-32 object-cover rounded border"
                          />
                          <a
                            href={photo}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                          >
                            <ImageIcon className="w-6 h-6 text-white" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

