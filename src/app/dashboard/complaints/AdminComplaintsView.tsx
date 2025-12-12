import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { Eye, Image as ImageIcon, Search, Filter, Building2 } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface ComplaintItem {
  sku: string
  name: string
  quantity: number
}

interface Complaint {
  id: string
  user_id: string
  order_id: string
  order_number?: number
  company_name?: string
  status: 'new' | 'in-progress' | 'resolved' | 'closed'
  items: ComplaintItem[]
  photos: string[]
  reason: string
  message: string
  internal_notes?: string
  created_at: string
  updated_at: string
}

// Map old status values to new ones
function mapStatus(status: string): Complaint['status'] {
  // Normalize status by removing "complaints." prefix if present
  const normalizedStatus = status.startsWith('complaints.')
    ? status.replace('complaints.', '')
    : status

  const statusMap: Record<string, Complaint['status']> = {
    pending: 'new',
    'in-review': 'in-progress',
    approved: 'resolved',
    rejected: 'closed',
  }
  return statusMap[normalizedStatus] || 'new'
}

// Map new status values to old ones for database
function mapStatusToDb(status: Complaint['status']): string {
  const statusMap: Record<Complaint['status'], string> = {
    'new': 'pending',
    'in-progress': 'in-review',
    'resolved': 'approved',
    'closed': 'rejected',
  }
  return statusMap[status]
}

// Status badge function removed - using OrderStatusBadge component instead

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

function formatComplaintDate(dateString: string): string {
  const date = new Date(dateString)
  const day = date.getDate()
  const month = date.toLocaleDateString('en-US', { month: 'short' })
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${day} ${month} ${year}, ${hours}:${minutes}`
}

export function AdminComplaintsView() {
  const { t } = useTranslation()
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [companyFilter, setCompanyFilter] = useState<string>('all')
  const { toast } = useToast()
  const queryClient = useQueryClient()

  // Fetch all complaints (admin sees all via RLS)
  const { data: complaints, isLoading } = useQuery({
    queryKey: ['admin-complaints'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('complaints')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching complaints:', error)
        throw error
      }

      // Fetch company names and order numbers for each complaint
      const complaintsWithDetails = await Promise.all(
        (data || []).map(async (complaint: any) => {
          let orderNumber = null
          let companyName = null

          // Get user profile to get company_id, then fetch company name
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', complaint.user_id)
            .single()

          // If profile has company_id, fetch company name from companies table
          if (profile?.company_id) {
            const { data: company } = await supabase
              .from('companies')
              .select('name')
              .eq('id', profile.company_id)
              .single()

            if (company?.name) {
              companyName = company.name
            }
          }

          // Also try to get company name from quotes table as fallback
          if (!companyName) {
            const { data: quote } = await supabase
              .from('quotes')
              .select('company_name, order_number')
              .eq('id', complaint.order_id)
              .single()

            if (quote?.company_name) {
              companyName = quote.company_name
            }
            if (quote?.order_number) {
              orderNumber = quote.order_number
            }
          } else {
            // Still get order number from quotes
            const { data: quote } = await supabase
              .from('quotes')
              .select('order_number')
              .eq('id', complaint.order_id)
              .single()

            if (quote?.order_number) {
              orderNumber = quote.order_number
            }
          }

          return {
            ...complaint,
            order_number: orderNumber,
            company_name: companyName,
            status: mapStatus(complaint.status),
            internal_notes: complaint.internal_notes || '',
          } as Complaint
        })
      )

      return complaintsWithDetails
    },
  })

  // Set up real-time subscription for complaints
  useEffect(() => {
    const channel = supabase
      .channel('admin-complaints-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'complaints',
        },
        () => {
          // Refetch complaints when any change occurs
          queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Complaint['status'] }) => {
      const dbStatus = mapStatusToDb(status)
      const { error } = await supabase
        .from('complaints')
        .update({ status: dbStatus })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      toast({
        title: t('complaints.statusUpdated'),
        description: t('complaints.statusUpdated'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('complaints.error'),
        description: error.message || t('complaints.failedToSubmit'),
        variant: 'destructive',
      })
    },
  })

  // Update internal notes mutation
  const updateInternalNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('complaints')
        .update({ internal_notes: notes })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-complaints'] })
      toast({
        title: t('complaints.noteAdded'),
        description: t('complaints.noteAdded'),
      })
    },
    onError: (error: Error) => {
      toast({
        title: t('complaints.error'),
        description: error.message || t('complaints.failedToSubmit'),
        variant: 'destructive',
      })
    },
  })

  // Get unique companies and status counts
  const companies = useMemo(() => {
    if (!complaints) return []
    const uniqueCompanies = new Set<string>()
    complaints.forEach(c => {
      if (c.company_name) {
        uniqueCompanies.add(c.company_name)
      }
    })
    return Array.from(uniqueCompanies).sort()
  }, [complaints])

  // Calculate status counts
  const statusCounts = useMemo(() => {
    if (!complaints) return { new: 0, 'in-progress': 0, resolved: 0, closed: 0 }
    
    return {
      new: complaints.filter(c => c.status === 'new').length,
      'in-progress': complaints.filter(c => c.status === 'in-progress').length,
      resolved: complaints.filter(c => c.status === 'resolved').length,
      closed: complaints.filter(c => c.status === 'closed').length,
    }
  }, [complaints])

  // Filter complaints
  const filteredComplaints = useMemo(() => {
    let filtered = complaints || []

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (complaint) =>
          complaint.id.toLowerCase().includes(query) ||
          complaint.order_id.toLowerCase().includes(query) ||
          complaint.company_name?.toLowerCase().includes(query) ||
          (complaint.order_number?.toString().includes(query))
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((complaint) => complaint.status === statusFilter)
    }

    // Company filter
    if (companyFilter !== 'all') {
      filtered = filtered.filter((complaint) => complaint.company_name === companyFilter)
    }

    return filtered
  }, [complaints, searchQuery, statusFilter, companyFilter])

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint)
    setDetailsOpen(true)
  }

  const handleStatusChange = (complaintId: string, newStatus: Complaint['status']) => {
    updateStatusMutation.mutate({ id: complaintId, status: newStatus })
  }

  const handleInternalNotesChange = (notes: string) => {
    if (!selectedComplaint) return
    updateInternalNotesMutation.mutate({ id: selectedComplaint.id, notes })
  }

  return (
    <>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold">{t('complaints.adminView')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('complaints.subtitle')}
          </p>
        </div>

        {/* Status Count Badges */}
        {complaints && complaints.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {statusCounts.new > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shadow-sm hover:bg-blue-500/15 transition-colors cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'new' ? 'all' : 'new')}>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
                  {t('complaints.new')}: {statusCounts.new}
                </span>
              </div>
            )}
            {statusCounts['in-progress'] > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 shadow-sm hover:bg-yellow-500/15 transition-colors cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'in-progress' ? 'all' : 'in-progress')}>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  {t('complaints.inProgress')}: {statusCounts['in-progress']}
                </span>
              </div>
            )}
            {statusCounts.resolved > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 shadow-sm hover:bg-green-500/15 transition-colors cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}>
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                  {t('complaints.resolved')}: {statusCounts.resolved}
                </span>
              </div>
            )}
            {statusCounts.closed > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 shadow-sm hover:bg-red-500/15 transition-colors cursor-pointer" onClick={() => setStatusFilter(statusFilter === 'closed' ? 'all' : 'closed')}>
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-sm"></div>
                <span className="text-xs font-semibold text-red-700 dark:text-red-400">
                  {t('complaints.closed')}: {statusCounts.closed}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Top Bar: Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('complaints.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder={t('complaints.allStatuses')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('complaints.allStatuses')}</SelectItem>
              <SelectItem value="new">{t('complaints.new')}</SelectItem>
              <SelectItem value="in-progress">{t('complaints.inProgress')}</SelectItem>
              <SelectItem value="resolved">{t('complaints.resolved')}</SelectItem>
              <SelectItem value="closed">{t('complaints.closed')}</SelectItem>
            </SelectContent>
          </Select>

          {/* Company Filter */}
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder={t('complaints.allCompanies')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('complaints.allCompanies')}</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>
                  {company}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Complaints Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('complaints.orderNumber')}</TableHead>
                <TableHead>{t('complaints.date')}</TableHead>
                <TableHead>{t('complaints.company')}</TableHead>
                <TableHead>{t('complaints.orderId')}</TableHead>
                <TableHead>{t('complaints.status')}</TableHead>
                <TableHead>{t('complaints.items')}</TableHead>
                <TableHead className="text-right">{t('complaints.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    {t('general.loading')}...
                  </TableCell>
                </TableRow>
              ) : filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">{t('complaints.noComplaints')}</p>
                      {(searchQuery || statusFilter !== 'all' || companyFilter !== 'all') ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setStatusFilter('all')
                            setCompanyFilter('all')
                          }}
                        >
                          {t('products.clearFilters')}
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredComplaints.map((complaint) => (
                  <TableRow key={complaint.id}>
                    <TableCell className="font-mono text-sm">
                      #{complaint.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatComplaintDate(complaint.created_at)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <div className="font-medium">
                          {complaint.company_name || t('overview.unknownCompany')}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {complaint.order_number
                        ? `#${complaint.order_number}`
                        : complaint.order_id.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={complaint.status}
                        onValueChange={(value) =>
                          handleStatusChange(complaint.id, value as Complaint['status'])
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">{t('complaints.new')}</SelectItem>
                          <SelectItem value="in-progress">{t('complaints.inProgress')}</SelectItem>
                          <SelectItem value="resolved">{t('complaints.resolved')}</SelectItem>
                          <SelectItem value="closed">{t('complaints.closed')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {complaint.items?.length || 0} {t('products.items')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(complaint)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {t('complaints.view')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Complaint Details Modal */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                    <p className="text-sm text-muted-foreground mb-1">{t('complaints.status')}</p>
                    <Select
                      value={selectedComplaint.status}
                      onValueChange={(value) => {
                        const updated = { ...selectedComplaint, status: value as Complaint['status'] }
                        setSelectedComplaint(updated)
                        handleStatusChange(selectedComplaint.id, value as Complaint['status'])
                      }}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">{t('complaints.new')}</SelectItem>
                        <SelectItem value="in-progress">{t('complaints.inProgress')}</SelectItem>
                        <SelectItem value="resolved">{t('complaints.resolved')}</SelectItem>
                        <SelectItem value="closed">{t('complaints.closed')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('complaints.orderId')}</p>
                    <p className="font-mono text-sm">
                      {selectedComplaint.order_number
                        ? `#${selectedComplaint.order_number}`
                        : selectedComplaint.order_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('complaints.company')}</p>
                    <p className="text-sm font-medium">
                      {selectedComplaint.company_name || t('general.none')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('general.date')}</p>
                    <p className="text-sm">{formatDateTime(selectedComplaint.created_at)}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('complaints.reason')}</p>
                  <p className="font-medium">{getReasonLabel(selectedComplaint.reason, t)}</p>
                </div>

                {/* Items */}
                {selectedComplaint.items && selectedComplaint.items.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">{t('complaints.items')}</p>
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

                {/* Internal Notes (Admin Only) */}
                <div>
                  <Label htmlFor="internal-notes">{t('complaints.internalNotes')}</Label>
                  <Textarea
                    id="internal-notes"
                    value={selectedComplaint.internal_notes || ''}
                    onChange={(e) => {
                      const updated = { ...selectedComplaint, internal_notes: e.target.value }
                      setSelectedComplaint(updated)
                    }}
                    onBlur={(e) => {
                      if (e.target.value !== (selectedComplaint.internal_notes || '')) {
                        handleInternalNotesChange(e.target.value)
                      }
                    }}
                    placeholder={t('complaints.addNote')}
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('complaints.internalNotesDescription')}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

