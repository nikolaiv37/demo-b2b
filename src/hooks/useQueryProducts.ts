import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Product } from '@/types'

export function useQueryProducts(supplierId?: string) {
  return useQuery({
    queryKey: ['products', supplierId],
    queryFn: async () => {
      let query = supabase.from('products').select('*').order('created_at', { ascending: false })

      if (supplierId) {
        query = query.eq('supplier_id', supplierId)
      }

      const { data, error } = await query

      if (error) throw error
      return data as Product[]
    },
    // For dev mode, always enable to show all products
    enabled: true,
  })
}

export function useQueryProduct(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single()

      if (error) throw error
      return data as Product
    },
    enabled: !!productId,
  })
}

export function useQueryPublicProducts(companySlug: string, filters?: {
  category?: string
  search?: string
  minPrice?: number
  maxPrice?: number
}) {
  return useQuery({
    queryKey: ['public-products', companySlug, filters],
    queryFn: async () => {
      // For MVP: Show all visible products
      // TODO: Later filter by company if needed
      let query = supabase
        .from('products')
        .select('*')
        .eq('is_visible', true)
        .gt('quantity', 0) // Only show in-stock products

      if (filters?.category) {
        query = query.eq('category', filters.category)
      }

      if (filters?.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`
        )
      }

      if (filters?.minPrice) {
        query = query.gte('weboffer_price', filters.minPrice)
      }

      if (filters?.maxPrice) {
        query = query.lte('weboffer_price', filters.maxPrice)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data as Product[]
    },
    enabled: !!companySlug,
  })
}

