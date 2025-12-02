import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { GlassCard } from '@/components/GlassCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import {
  FolderKanban,
  Plus,
  Edit,
  Trash2,
  Merge,
  Image as ImageIcon,
} from 'lucide-react'

interface Category {
  id: string
  name: string
  parent_id: string | null
  image_url: string | null
}

interface CategoryWithChildren extends Category {
  children: CategoryWithChildren[]
}

type CategoryFilter = 'all' | 'main' | 'sub'

export function ManageCategoriesPage() {
  const { t } = useTranslation()
  const { company } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<CategoryFilter>('all')

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [mergeModalOpen, setMergeModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [targetCategoryId, setTargetCategoryId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')
  const [parentIdInput, setParentIdInput] = useState<string | 'none'>('none')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      // For now, load all categories regardless of company to keep
      // the Manage view in sync with the single-wholesaler catalog.
      const { data, error } = await supabase
        .from('categories')
        .select('id,name,parent_id,image_url')
        .order('name', { ascending: true })

      if (error) {
        // If categories table does not exist yet, fail gracefully with empty list
        if ((error as { code?: string }).code === 'PGRST205') {
          console.warn('categories table not found – run create-categories-table.sql migration in Supabase')
          return []
        }
        console.error('Error loading categories', error)
        throw error
      }
      return (data || []) as Category[]
    },
  })

  const { data: productCounts = {} } = useQuery<Record<string, number>>({
    queryKey: ['category-product-counts'],
    queryFn: async () => {
      const result: Record<string, number> = {}

      for (const cat of categories) {
        const { count, error } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .ilike('category', `${cat.name}%`)

        if (!error && typeof count === 'number') {
          result[cat.id] = count
        }
      }

      return result
    },
    enabled: categories.length > 0,
  })

  const buildTree = (items: Category[]): CategoryWithChildren[] => {
    const map = new Map<string, CategoryWithChildren>()
    const roots: CategoryWithChildren[] = []

    items.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] })
    })

    map.forEach((cat) => {
      if (cat.parent_id && map.has(cat.parent_id)) {
        map.get(cat.parent_id)!.children.push(cat)
      } else {
        roots.push(cat)
      }
    })

    return roots
  }

  const tree = useMemo(() => buildTree(categories), [categories])
  const hasAnyCategories = tree.length > 0

  const flatFilteredCategories = useMemo(() => {
    const matchesFilter = (cat: Category) => {
      if (filter === 'main') return !cat.parent_id
      if (filter === 'sub') return !!cat.parent_id
      return true
    }

    return categories.filter((cat) => {
      if (!matchesFilter(cat)) return false
      if (!search.trim()) return true
      return cat.name.toLowerCase().includes(search.toLowerCase())
    })
  }, [categories, filter, search])

  const openCreateModal = () => {
    setSelectedCategory(null)
    setNameInput('')
    setParentIdInput('none')
    setImageFile(null)
    setEditModalOpen(true)
  }

  const openEditModal = (category: Category) => {
    setSelectedCategory(category)
    setNameInput(category.name)
    setParentIdInput(category.parent_id || 'none')
    setImageFile(null)
    setEditModalOpen(true)
  }

  const openDeleteModal = (category: Category) => {
    setSelectedCategory(category)
    setDeleteModalOpen(true)
  }

  const openMergeModal = (category: Category) => {
    setSelectedCategory(category)
    setTargetCategoryId(null)
    setMergeModalOpen(true)
  }

  const invalidateCategories = () => {
    queryClient.invalidateQueries({ queryKey: ['categories'] })
    queryClient.invalidateQueries({ queryKey: ['category-product-counts'] })
  }

  // When a category is renamed, update legacy text-based product.category strings
  // so existing catalog views that still rely on that field stay in sync.
  const propagateCategoryRename = async (oldCategory: Category, newName: string) => {
    // If this is a main category (no parent), update:
    // - Products directly in this main category
    // - Products in all its direct subcategories ("Main > Sub")
    if (!oldCategory.parent_id) {
      // Update products directly assigned to this main category
      await supabase
        .from('products')
        .update({ category: newName })
        .eq('category_id', oldCategory.id)

      // Find direct subcategories
      const { data: children } = await supabase
        .from('categories')
        .select('id,name,parent_id')
        .eq('parent_id', oldCategory.id)

      for (const child of (children || []) as { id: string; name: string; parent_id: string | null }[]) {
        const fullName = `${newName} > ${child.name}`
        await supabase
          .from('products')
          .update({ category: fullName })
          .eq('category_id', child.id)
      }
    } else {
      // Subcategory rename: update only products in this leaf category
      // Text format: "ParentName > SubName"
      const parent = categories.find((c) => c.id === oldCategory.parent_id)
      const parentName = parent?.name || ''
      const fullName = parentName ? `${parentName} > ${newName}` : newName

      await supabase
        .from('products')
        .update({ category: fullName })
        .eq('category_id', oldCategory.id)
    }
  }

  const uploadImageIfNeeded = async (): Promise<string | null> => {
    if (!imageFile) return null

    const fileExt = imageFile.name.split('.').pop()
    const fileName = `category-${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('category-images')
      .upload(fileName, imageFile, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      toast({
        title: t('general.error'),
        description: t('company.failedToUploadLogo'),
        variant: 'destructive',
      })
      throw uploadError
    }

    const { data: publicData } = supabase.storage
      .from('category-images')
      .getPublicUrl(fileName)

    return publicData.publicUrl || null
  }

  const upsertCategoryMutation = useMutation({
    mutationFn: async () => {
      setIsSubmitting(true)
      try {
        const imageUrl = await uploadImageIfNeeded()

        if (!company?.id) {
          throw new Error('Missing company context for category operation')
        }

        if (selectedCategory) {
          const { error } = await supabase
            .from('categories')
            .update({
              name: nameInput,
              parent_id: parentIdInput === 'none' ? null : parentIdInput,
              ...(imageUrl ? { image_url: imageUrl } : {}),
            })
            .eq('id', selectedCategory.id)

          if (error) throw error
          // Keep legacy product.category text in sync with the new name
          await propagateCategoryRename(selectedCategory, nameInput)
        } else {
          const { error } = await supabase.from('categories').insert({
            company_id: company.id,
            name: nameInput,
            parent_id: parentIdInput === 'none' ? null : parentIdInput,
            image_url: imageUrl,
          })

          if (error) throw error
        }
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      toast({
        title: t('general.success'),
        description: t('categories.browseCategories'),
      })
      setEditModalOpen(false)
      invalidateCategories()
      // Refresh buyer catalog / category hierarchy
      queryClient.invalidateQueries({ queryKey: ['category-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['category-products'] })
    },
    onError: () => {
      toast({
        title: t('general.error'),
        description: t('settings.failedToUpdate'),
        variant: 'destructive',
      })
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory) return

      setIsSubmitting(true)
      try {
        // Reassign products to Uncategorized before deleting
        const { error: updateError } = await supabase
          .from('products')
          .update({ category: t('overview.uncategorized') })
          .ilike('category', `${selectedCategory.name}%`)

        if (updateError) throw updateError

        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', selectedCategory.id)

        if (error) throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      toast({
        title: t('general.success'),
        description: t('general.delete'),
      })
      setDeleteModalOpen(false)
      invalidateCategories()
      queryClient.invalidateQueries({ queryKey: ['category-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['category-products'] })
    },
    onError: () => {
      toast({
        title: t('general.error'),
        description: t('products.failedToDelete'),
        variant: 'destructive',
      })
    },
  })

  const mergeCategoryMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCategory || !targetCategoryId) return
      if (targetCategoryId === selectedCategory.id) return

      const target = categories.find((c) => c.id === targetCategoryId)
      if (!target) return

      setIsSubmitting(true)
      try {
        // Move products to target category
        const { error: updateError } = await supabase
          .from('products')
          .update({ category: target.name })
          .ilike('category', `${selectedCategory.name}%`)

        if (updateError) throw updateError

        // Delete source category
        const { error } = await supabase
          .from('categories')
          .delete()
          .eq('id', selectedCategory.id)

        if (error) throw error
      } finally {
        setIsSubmitting(false)
      }
    },
    onSuccess: () => {
      toast({
        title: t('general.success'),
        description: t('general.apply'),
      })
      setMergeModalOpen(false)
      invalidateCategories()
      queryClient.invalidateQueries({ queryKey: ['category-hierarchy'] })
      queryClient.invalidateQueries({ queryKey: ['category-products'] })
    },
    onError: () => {
      toast({
        title: t('general.error'),
        description: t('products.failedToDelete'),
        variant: 'destructive',
      })
    },
  })

  const renderRow = (cat: CategoryWithChildren, level = 0): JSX.Element[] => {
    const count = productCounts[cat.id] ?? 0

    const row = (
      <TableRow key={cat.id}>
          <TableCell>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full border',
                  level === 0
                    ? 'bg-primary/5 border-primary/40 text-primary'
                    : 'bg-muted/60 border-muted-foreground/20 text-muted-foreground'
                )}
              >
                {level === 0 ? t('csvImport.categoryMapping.mainCategory') : t('csvImport.categoryMapping.subCategory')}
              </span>
              <span className={cn(level > 0 && 'pl-4')}>
                {cat.name}
              </span>
            </div>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {cat.parent_id
              ? categories.find((c) => c.id === cat.parent_id)?.name || '—'
              : t('csvImport.categoryMapping.topLevelCategory')}
          </TableCell>
          <TableCell>
            {cat.image_url ? (
              <img
                src={cat.image_url}
                alt={cat.name}
                className="h-10 w-10 rounded-md object-cover border border-border"
              />
            ) : (
              <div className="h-10 w-10 rounded-md border border-dashed border-muted-foreground/40 flex items-center justify-center text-muted-foreground">
                <ImageIcon className="w-4 h-4" />
              </div>
            )}
          </TableCell>
          <TableCell>
            <Badge variant={count > 0 ? 'secondary' : 'outline'}>
              {count}
            </Badge>
          </TableCell>
          <TableCell className="space-x-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => openEditModal(cat)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => openMergeModal(cat)}
            >
              <Merge className="w-4 h-4" />
            </Button>
            <Button
              variant="destructive"
              size="icon"
              className="h-8 w-8"
              onClick={() => openDeleteModal(cat)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </TableCell>
        </TableRow>
    )

    const childRows = cat.children.flatMap((child) => renderRow(child, level + 1))
    return [row, ...childRows]
  }

  const allParents = categories.filter((c) => !c.parent_id)

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast({
        title: t('company.invalidFileType'),
        description: t('company.pleaseUploadImage'),
        variant: 'destructive',
      })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('company.fileTooLarge'),
        description: t('company.pleaseUploadSmaller'),
        variant: 'destructive',
      })
      return
    }
    setImageFile(file)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <FolderKanban className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t('categories.manageTitle', 'Manage Categories')}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t(
                  'categories.manageSubtitle',
                  'Admin-only view for maintaining your category hierarchy.'
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          <Input
            placeholder={t('general.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full md:w-64"
          />
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              {t('general.all')}
            </Button>
            <Button
              variant={filter === 'main' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('main')}
            >
              {t('csvImport.categoryMapping.mainCategory')}
            </Button>
            <Button
              variant={filter === 'sub' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('sub')}
            >
              {t('csvImport.categoryMapping.subCategory')}
            </Button>
          </div>
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4 mr-2" />
            {t('categories.addCategory', 'Add Category')}
          </Button>
        </div>
      </div>

      <GlassCard className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('general.name')}</TableHead>
              <TableHead>{t('csvImport.categoryMapping.parentCategory')}</TableHead>
              <TableHead>{t('categories.imagePreview', 'Image')}</TableHead>
              <TableHead>{t('orders.items')}</TableHead>
              <TableHead className="text-right">
                {t('general.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center">
                  {t('general.loading')}
                </TableCell>
              </TableRow>
            ) : !hasAnyCategories ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10">
                  <div className="flex flex-col items-center justify-center gap-4">
                    <p className="text-sm text-muted-foreground">
                      {t('categories.noCategories', 'No categories yet.')}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : search || filter !== 'all' ? (
              flatFilteredCategories.flatMap((cat) =>
                renderRow({ ...cat, children: [] })
              )
            ) : (
              tree.flatMap((cat) => renderRow(cat))
            )}
          </TableBody>
        </Table>
      </GlassCard>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedCategory
                ? t('categories.editCategory', 'Edit Category')
                : t('categories.addCategory', 'Add Category')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'categories.editCategoryDescription',
                'Update the name, parent and image for this category.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t('general.name')} <span className="text-destructive">*</span>
              </label>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder={t('categories.namePlaceholder', 'Category name')}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                {t('csvImport.categoryMapping.parentCategory')}
              </label>
              <select
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={parentIdInput}
                onChange={(e) =>
                  setParentIdInput(e.target.value as string | 'none')
                }
              >
                <option value="none">
                  {t('csvImport.categoryMapping.topLevelCategory')}
                </option>
                {allParents.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                {t('categories.imageLabel', 'Image (optional)')}
              </label>
              <Input type="file" accept="image/*" onChange={onImageChange} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setEditModalOpen(false)}
              >
                {t('general.cancel')}
              </Button>
              <Button
                disabled={!nameInput.trim() || isSubmitting}
                onClick={() => upsertCategoryMutation.mutate()}
              >
                {t('general.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('categories.deleteCategory', 'Delete Category')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'categories.deleteWarning',
                'All products in this category will be moved to "Uncategorized". This action cannot be undone.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              {t('general.cancel')}
            </Button>
            <Button
              variant="destructive"
              disabled={isSubmitting}
              onClick={() => deleteCategoryMutation.mutate()}
            >
              {t('general.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeModalOpen} onOpenChange={setMergeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('categories.mergeCategory', 'Merge Category')}
            </DialogTitle>
            <DialogDescription>
              {t(
                'categories.mergeDescription',
                'Select a target category. All products will be moved and the current category will be deleted.'
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <select
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={targetCategoryId || ''}
              onChange={(e) => setTargetCategoryId(e.target.value)}
            >
              <option value="">{t('categories.selectTarget', 'Select target')}</option>
              {categories
                .filter((c) => !selectedCategory || c.id !== selectedCategory.id)
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMergeModalOpen(false)}
              >
                {t('general.cancel')}
              </Button>
              <Button
                disabled={!targetCategoryId || isSubmitting}
                onClick={() => mergeCategoryMutation.mutate()}
              >
                {t('general.apply')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


