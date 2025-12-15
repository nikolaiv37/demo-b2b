import { useState, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { format, formatDistanceToNow } from 'date-fns'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Pagination } from '@/components/ui/pagination'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tooltip } from '@/components/ui/tooltip'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useQueryClients } from '@/hooks/useQueryClients'
import {
  useMutationUpdateClient,
  useMutationDeleteClient,
} from '@/hooks/useMutationClient'
import { Client } from '@/types'
import {
  Users,
  Search,
  Edit,
  Trash2,
  Percent,
  Info,
  Mail,
  Calendar,
  AlertCircle,
  Loader2,
  ShoppingBag,
  UserPlus,
  Sparkles,
} from 'lucide-react'

const ITEMS_PER_PAGE = 12

export function ClientsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const { toast } = useToast()

  const [searchQuery, setSearchQuery] = useState('')
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingClient, setDeletingClient] = useState<Client | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<
    'joinDateDesc' | 'joinDateAsc' | 'commissionDesc' | 'commissionAsc'
  >('joinDateDesc')

  const [editForm, setEditForm] = useState({
    commission_rate: 0,
  })

  const { data: clients, isLoading, error } = useQueryClients()
  const updateMutation = useMutationUpdateClient()
  const deleteMutation = useMutationDeleteClient()

  const filteredClients = useMemo(() => {
    if (!clients) return []
    if (!searchQuery) return clients

    const query = searchQuery.toLowerCase()
    return clients.filter((c) => {
      const name = (c.full_name || c.company_name || '').toLowerCase()
      const email = (c.email || '').toLowerCase()
      return name.includes(query) || email.includes(query)
    })
  }, [clients, searchQuery])

  const sortedClients = useMemo(() => {
    const items = [...filteredClients]

    return items.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      const rateA = a.commission_rate ?? 0
      const rateB = b.commission_rate ?? 0

      switch (sortBy) {
        case 'joinDateAsc':
          return dateA - dateB
        case 'joinDateDesc':
          return dateB - dateA
        case 'commissionAsc':
          return rateA - rateB
        case 'commissionDesc':
          return rateB - rateA
        default:
          return 0
      }
    })
  }, [filteredClients, sortBy])

  // Pagination
  const totalPages = Math.ceil(sortedClients.length / ITEMS_PER_PAGE)
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedClients.slice(start, start + ITEMS_PER_PAGE)
  }, [sortedClients, currentPage])

  // Reset to page 1 when search/sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, sortBy])

  const clientsCount = sortedClients.length

  // Redirect non-admin users
  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard')
    }
  }, [isAdmin, navigate])

  // Early return AFTER all hooks
  if (!isAdmin) {
    return null
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setEditForm({
      commission_rate: (client.commission_rate || 0) * 100,
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async () => {
    if (!editingClient) return

    if (editForm.commission_rate < 0 || editForm.commission_rate > 50) {
      toast({
        title: t('distributors.error'),
        description: t('distributors.commissionRateError'),
        variant: 'destructive',
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingClient.id,
        commission_rate: editForm.commission_rate / 100,
      })

      toast({
        title: t('distributors.success'),
        description: t('distributors.updateSuccess'),
      })
      setIsEditModalOpen(false)
      setEditingClient(null)
    } catch {
      toast({
        title: t('distributors.error'),
        description: t('distributors.updateError'),
        variant: 'destructive',
      })
    }
  }

  const handleDeleteClick = (client: Client) => {
    setDeletingClient(client)
    setIsDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!deletingClient) return

    try {
      await deleteMutation.mutateAsync(deletingClient.id)
      toast({
        title: t('distributors.success'),
        description: t('distributors.deleteSuccess'),
      })
      setIsDeleteDialogOpen(false)
      setDeletingClient(null)
    } catch {
      toast({
        title: t('distributors.error'),
        description: t('distributors.deleteError'),
        variant: 'destructive',
      })
    }
  }

  const formatCommissionRate = (rate?: number | null) => {
    if (rate === undefined || rate === null || rate === 0) {
      return null
    }
    const percentage = rate * 100
    return `${percentage.toFixed(percentage % 1 === 0 ? 0 : 1)}%`
  }

  const getCompanyName = (client: Client) => {
    if (client.company_name && client.company_name.trim().length > 0) {
      return client.company_name
    }
    if (client.full_name && client.full_name.trim().length > 0) {
      return client.full_name
    }
    if (client.email && client.email.trim().length > 0) {
      return client.email
    }
    return t('distributors.unnamed')
  }

  const getEmailDisplay = (client: Client) => {
    if (client.email && client.email.trim().length > 0) {
      return client.email
    }
    return t('distributors.noEmail')
  }

  const getAvatarInitials = (client: Client) => {
    const source =
      client.full_name?.trim() ||
      client.company_name?.trim() ||
      client.email?.split('@')[0] ||
      'CL'

    const parts = source.split(/\s+/).filter(Boolean)

    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase()
    }

    return source.substring(0, 2).toUpperCase()
  }

  const getAvatarColorClass = (client: Client) => {
    const seed =
      client.id ||
      client.email ||
      client.full_name ||
      client.company_name ||
      'default'

    const hash = Array.from(seed).reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const palette = [
      'from-sky-500 to-sky-600',
      'from-violet-500 to-violet-600',
      'from-emerald-500 to-emerald-600',
      'from-amber-500 to-amber-600',
      'from-rose-500 to-rose-600',
      'from-cyan-500 to-cyan-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
    ]

    return palette[hash % palette.length]
  }

  const getJoinedAgo = (date?: string) => {
    if (!date) return null
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500/15 via-sky-500/5 to-transparent dark:from-sky-400/20 dark:via-sky-400/5 border border-sky-500/20 shadow-sm backdrop-blur-sm">
            <Users className="w-6 h-6 text-sky-600 dark:text-sky-300" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {t('distributors.title')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('distributors.subtitle')}
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <Alert className="border border-sky-500/20 bg-sky-500/5 dark:bg-sky-900/20 backdrop-blur-md rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 shrink-0">
            <Info className="h-4 w-4 text-sky-600 dark:text-sky-300" />
          </div>
          <AlertDescription className="text-sm text-sky-900/80 dark:text-sky-50/90">
            New clients sign up through the platform and will appear here automatically.
          </AlertDescription>
        </div>
      </Alert>

      {/* Search & Filter Bar */}
      <GlassCard>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder={t('distributors.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 justify-between md:justify-end w-full md:w-auto">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-full">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium tabular-nums">
                {clientsCount} {clientsCount === 1 ? 'client' : 'clients'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground sr-only">Sort by</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as typeof sortBy)}
              >
                <SelectTrigger className="h-9 w-[160px] text-xs bg-background/60 backdrop-blur-sm border-border/60">
                  <SelectValue placeholder="Newest first" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="joinDateDesc">Newest first</SelectItem>
                  <SelectItem value="joinDateAsc">Oldest first</SelectItem>
                  <SelectItem value="commissionDesc">Highest rate</SelectItem>
                  <SelectItem value="commissionAsc">Lowest rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Main Content */}
      <GlassCard className="p-0">
        {isLoading ? (
          <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/40 bg-gradient-to-br from-sky-50/70 via-background/60 to-background/90 dark:from-sky-900/30 dark:via-slate-900/70 dark:to-slate-950/90 backdrop-blur-md shadow-sm p-5 space-y-4"
              >
                <div className="flex items-start gap-3">
                  <Skeleton className="h-11 w-11 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
                <div className="h-px bg-border/40" />
                <div className="space-y-2.5">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <div className="flex gap-1">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
            <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold">{t('distributors.errorLoading')}</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                {t('distributors.errorLoadingDesc')}
              </p>
            </div>
          </div>
        ) : sortedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="max-w-md w-full">
              <div className="relative">
                {/* Decorative background */}
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 via-transparent to-violet-500/5 rounded-3xl" />
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl" />
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
                
                <GlassCard className="relative text-center border-dashed border-2 border-muted/40 bg-background/40 dark:bg-background/20 py-10 px-6">
                  <div className="flex flex-col items-center gap-5">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-600/20 flex items-center justify-center shadow-lg">
                        <Users className="w-8 h-8 text-sky-600 dark:text-sky-400" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md">
                        <Sparkles className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="text-lg font-semibold text-foreground">
                        {searchQuery ? t('distributors.noResults') : 'No clients yet'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                        {searchQuery
                          ? t('distributors.noResultsDesc')
                          : 'Invite them to sign up via the platform! Clients will appear here automatically once they complete signup.'}
                      </p>
                    </div>

                    {!searchQuery && (
                      <Button
                        variant="outline"
                        className="mt-2 gap-2 rounded-full px-5 border-sky-500/30 text-sky-700 dark:text-sky-300 hover:bg-sky-500/10 hover:border-sky-500/50"
                        onClick={() => {
                          toast({
                            title: 'Invite clients',
                            description: 'Share your platform URL with potential clients to let them sign up.',
                          })
                        }}
                      >
                        <UserPlus className="w-4 h-4" />
                        Invite Now
                      </Button>
                    )}
                  </div>
                </GlassCard>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedClients.map((client) => {
                const commissionDisplay = formatCommissionRate(client.commission_rate)
                const hasCommission = commissionDisplay !== null
                const joinedAgo = getJoinedAgo(client.created_at)
                const ordersCount = client.orders_count ?? 0
                
                return (
                  <Card
                    key={client.id}
                    className="group relative rounded-2xl border border-border/50 bg-gradient-to-br from-white/80 via-white/60 to-gray-50/80 dark:from-slate-900/80 dark:via-slate-900/60 dark:to-slate-950/80 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-0.5 hover:border-sky-500/30 min-h-[210px] overflow-visible"
                  >
                    {/* Subtle gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-sky-500/0 to-sky-500/0 group-hover:from-sky-500/[0.02] group-hover:to-violet-500/[0.02] transition-all duration-300 pointer-events-none" />
                    
                    <CardContent className="relative p-5 flex flex-col h-full">
                      {/* Header: Avatar + Name + Badge */}
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-11 h-11 rounded-full bg-gradient-to-br ${getAvatarColorClass(
                            client,
                          )} flex items-center justify-center text-white text-sm font-semibold shadow-md ring-2 ring-white/20 shrink-0`}
                        >
                          {getAvatarInitials(client)}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <h3 className="text-sm font-semibold text-foreground truncate leading-tight">
                            {getCompanyName(client)}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            {getEmailDisplay(client)}
                          </p>
                        </div>
                      </div>

                      {/* Divider */}
                      <div className="h-px bg-border/40 my-4" />

                      {/* Details Grid */}
                      <div className="space-y-3.5 flex-1 pb-1">
                        {/* Commission Rate Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span>Commission</span>
                            <Tooltip content={t('distributors.commissionRateTooltip')} side="top">
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-full hover:bg-muted/80 p-0.5 transition-colors"
                              >
                                <Info className="w-3 h-3 text-muted-foreground/70" />
                              </button>
                            </Tooltip>
                          </div>
                          {hasCommission ? (
                            <Badge 
                              className="gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            >
                              <Percent className="w-3 h-3" />
                              {commissionDisplay}
                            </Badge>
                          ) : (
                            <span className="text-sm font-medium text-muted-foreground/60 tabular-nums">—%</span>
                          )}
                        </div>

                        {/* Join Date Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Joined</span>
                          </div>
                          <Tooltip content={joinedAgo || ''} side="top">
                            <span className="text-xs font-medium text-foreground/80 tabular-nums cursor-default">
                              {client.created_at
                                ? format(new Date(client.created_at), 'MMM d, yyyy')
                                : '—'}
                            </span>
                          </Tooltip>
                        </div>

                        {/* Orders Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <ShoppingBag className="w-3 h-3" />
                            <span>Orders</span>
                          </div>
                          <span className="text-xs font-medium text-foreground/80 tabular-nums">
                            {ordersCount}
                          </span>
                        </div>

                        {/* Email Row (for scan + searchability) */}
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/70">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate leading-relaxed">
                            {getEmailDisplay(client)}
                          </span>
                        </div>
                      </div>

                      {/* Footer: Actions */}
                      <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/20">
                        <div className="flex items-center gap-1.5">
                          {hasCommission && (
                            <Badge 
                              variant="outline" 
                              className="text-[10px] uppercase tracking-wider px-2 py-0.5 font-medium border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                            >
                              <ShoppingBag className="w-2.5 h-2.5 mr-1" />
                              Discounted
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-3 opacity-80 group-hover:opacity-100 transition-opacity text-xs"
                            onClick={() => handleEdit(client)}
                          >
                            <Edit className="w-3.5 h-3.5 mr-1" />
                            <span>{t('general.edit')}</span>
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 rounded-full px-3 opacity-80 group-hover:opacity-100 transition-opacity text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            onClick={() => handleDeleteClick(client)}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            <span>{t('general.delete')}</span>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-6 flex flex-col items-center gap-3">
                <div className="text-xs text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, clientsCount)} of {clientsCount} clients
                </div>
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        )}
      </GlassCard>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-sky-500" />
              Edit Client Commission
            </DialogTitle>
            <DialogDescription>
              Set the commission rate for <span className="font-medium">{editingClient ? getCompanyName(editingClient) : 'this client'}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Label htmlFor="commission_rate" className="text-sm font-medium">
                    {t('distributors.commissionRateLabel')}
                  </Label>
                  <Tooltip content={t('distributors.commissionRateTooltip')} side="top">
                    <button type="button" className="rounded-full hover:bg-muted p-0.5">
                      <Info className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </Tooltip>
                </div>
                <Badge 
                  variant={editForm.commission_rate > 0 ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {editForm.commission_rate > 0 ? `${editForm.commission_rate}% discount` : 'No discount'}
                </Badge>
              </div>
              <div className="relative">
                <Input
                  id="commission_rate"
                  type="number"
                  min="0"
                  max="50"
                  step="0.5"
                  value={editForm.commission_rate}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      commission_rate: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="pr-10 text-lg font-semibold h-12"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('distributors.commissionRateHelp')}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
              {t('general.cancel')}
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
              className="gap-2"
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              {t('distributors.deleteConfirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to delete <span className="font-medium">{deletingClient ? getCompanyName(deletingClient) : 'this client'}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              {t('general.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              {t('general.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
