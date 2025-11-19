import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from './useAuth'
import { WishlistItem } from '@/types'

// Wishlist is per-user, persisted forever, survives catalog re-uploads (uses SKU)

/**
 * Hook to manage wishlist items
 * Provides real-time updates via Supabase subscriptions
 */
export function useWishlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const userId = user?.id

  // Fetch all wishlist items for the current user
  const { data: wishlistItems = [], isLoading } = useQuery({
    queryKey: ['wishlist', userId],
    queryFn: async () => {
      if (!userId) return []

      const { data, error } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as WishlistItem[]
    },
    enabled: !!userId,
  })

  // Set up realtime subscription for wishlist changes
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('wishlist-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'wishlist_items',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Invalidate and refetch wishlist on any change
          queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, queryClient])

  // Get set of SKUs in wishlist for quick lookup
  const wishlistSkus = new Set(wishlistItems.map((item) => item.product_sku))

  // Check if a product (by SKU) is in wishlist
  const isInWishlist = (sku: string) => wishlistSkus.has(sku)

  // Add item to wishlist (optimistic update)
  const addToWishlistMutation = useMutation({
    mutationFn: async (sku: string) => {
      if (!userId) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('wishlist_items')
        .insert({ user_id: userId, product_sku: sku })
        .select()
        .single()

      if (error) {
        // If it's a unique constraint violation, item already exists - that's okay
        if (error.code === '23505') {
          return { id: '', user_id: userId, product_sku: sku, created_at: new Date().toISOString() }
        }
        throw error
      }

      return data as WishlistItem
    },
    onMutate: async (sku) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist', userId] })

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<WishlistItem[]>(['wishlist', userId])

      // Optimistically update
      if (previousItems && !previousItems.some((item) => item.product_sku === sku)) {
        const optimisticItem: WishlistItem = {
          id: `temp-${Date.now()}`,
          user_id: userId!,
          product_sku: sku,
          created_at: new Date().toISOString(),
        }
        queryClient.setQueryData<WishlistItem[]>(['wishlist', userId], [
          optimisticItem,
          ...previousItems,
        ])
      }

      return { previousItems }
    },
    onError: (_err, _sku, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['wishlist', userId], context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
    },
  })

  // Remove item from wishlist (optimistic update)
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (sku: string) => {
      if (!userId) throw new Error('User not authenticated')

      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', userId)
        .eq('product_sku', sku)

      if (error) throw error
    },
    onMutate: async (sku) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['wishlist', userId] })

      // Snapshot previous value
      const previousItems = queryClient.getQueryData<WishlistItem[]>(['wishlist', userId])

      // Optimistically update
      if (previousItems) {
        queryClient.setQueryData<WishlistItem[]>(
          ['wishlist', userId],
          previousItems.filter((item) => item.product_sku !== sku)
        )
      }

      return { previousItems }
    },
    onError: (_err, _sku, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData(['wishlist', userId], context.previousItems)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist', userId] })
    },
  })

  // Toggle wishlist item
  const toggleWishlist = (sku: string) => {
    if (isInWishlist(sku)) {
      removeFromWishlistMutation.mutate(sku)
    } else {
      addToWishlistMutation.mutate(sku)
    }
  }

  return {
    wishlistItems,
    wishlistSkus,
    isInWishlist,
    isLoading,
    addToWishlist: addToWishlistMutation.mutate,
    removeFromWishlist: removeFromWishlistMutation.mutate,
    toggleWishlist,
    count: wishlistItems.length,
  }
}

