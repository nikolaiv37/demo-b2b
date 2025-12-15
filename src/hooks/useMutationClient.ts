import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Client } from '@/types'

interface UpdateClientData {
  id: string
  commission_rate?: number
}

export function useMutationUpdateClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: UpdateClientData) => {
      const { id, ...updates } = data

      const { data: client, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .eq('role', 'company')
        .select()
        .single()

      if (error) throw error
      return client as Client
    },
    onSuccess: (data, variables) => {
      // Invalidate client queries
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', data.id] })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      
      // If commission_rate was updated, invalidate product queries
      // This ensures catalog views update with new adjusted prices
      if (variables.commission_rate !== undefined) {
        // Invalidate all product queries so adjusted prices are recalculated
        queryClient.invalidateQueries({ queryKey: ['products'] })
        queryClient.invalidateQueries({ queryKey: ['public-products'] })
        queryClient.invalidateQueries({ queryKey: ['product'] })
        // Also invalidate quotes so they show updated pricing
        queryClient.invalidateQueries({ queryKey: ['quotes'] })
      }
    },
  })
}

export function useMutationDeleteClient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (clientId: string) => {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', clientId)
        .eq('role', 'company')

      if (error) throw error
      return clientId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
    },
  })
}


