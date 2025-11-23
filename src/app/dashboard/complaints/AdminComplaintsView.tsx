import { useState, useMemo, useEffect } from 'react'
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
import { Eye, Image as ImageIcon, Search } from 'lucide-react'
import { formatDateTime } from '@/lib/utils'

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
  const statusMap: Record<string, Complaint['status']> = {
    pending: 'new',
    'in-review': 'in-progress',
    approved: 'resolved',
    rejected: 'closed',
  }
  return statusMap[status] || 'new'
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

function getReasonLabel(reason: string) {
  const labels: Record<string, string> = {
    damaged_transport: 'Damaged in transport',
    wrong_product: 'Wrong product',
    missing_parts: 'Missing parts',
    defective: 'Defective',
    other: 'Other',
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
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
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

          // Get user profile to get company name
          const { data: profile } = await supabase
            .from('profiles')
            .select('company_name')
            .eq('id', complaint.user_id)
            .single()

          if (profile?.company_name) {
            companyName = profile.company_name
          }

          // Try quotes table to get order number
          const { data: quote } = await supabase
            .from('quotes')
            .select('order_number')
            .eq('id', complaint.order_id)
            .single()

          if (quote?.order_number) {
            orderNumber = quote.order_number
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
        title: 'Status updated',
        description: 'The complaint status has been updated.',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error updating status',
        description: error.message || 'Failed to update complaint status.',
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

    return filtered
  }, [complaints, searchQuery, statusFilter])

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
          <h1 className="text-3xl font-bold">All Customer Complaints</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all customer complaints
          </p>
        </div>

        {/* Top Bar: Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by ticket ID, order ID, or company name..."
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
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Complaints Table */}
        <div className="border rounded-lg bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Order ID</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading complaints...
                  </TableCell>
                </TableRow>
              ) : filteredComplaints.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">No complaints found</p>
                      {searchQuery || statusFilter !== 'all' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setStatusFilter('all')
                          }}
                        >
                          Clear filters
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
                      <div className="font-medium">
                        {complaint.company_name || 'Unknown Company'}
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
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in-progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {complaint.items?.length || 0} item{complaint.items?.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(complaint)}
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
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
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
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
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
                    <p className="text-sm text-muted-foreground mb-1">Company Name</p>
                    <p className="text-sm font-medium">
                      {selectedComplaint.company_name || 'Unknown Company'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Created</p>
                    <p className="text-sm">{formatDateTime(selectedComplaint.created_at)}</p>
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Reason</p>
                  <p className="font-medium">{getReasonLabel(selectedComplaint.reason)}</p>
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
                    <p className="text-sm text-muted-foreground mb-1">Description</p>
                    <p className="text-sm whitespace-pre-wrap">{selectedComplaint.message}</p>
                  </div>
                )}

                {/* Photos */}
                {selectedComplaint.photos && selectedComplaint.photos.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Photos</p>
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
                  <Label htmlFor="internal-notes">Internal Notes</Label>
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
                    placeholder="Add internal notes about this complaint (only visible to admins)..."
                    rows={4}
                    className="mt-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    These notes are only visible to admins and will not be shown to the customer.
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

