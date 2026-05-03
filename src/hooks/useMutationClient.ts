import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Client } from '@/types'
import { useTenant } from '@/lib/tenant/TenantProvider'
import { sendNotification } from '@/lib/notifications'

interface UpdateClientData {
  id: string
  commission_rate?: number
}

interface UpdateClientDiscountResult {
  success: boolean
  client: {
    id: string
    email: string
    commission_rate: number
  }
}

export function useMutationUpdateClient() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useMutation({
    mutationFn: async (data: UpdateClientData) => {
      if (!tenantId) {
        throw new Error('Missing tenant context')
      }

      const { data: result, error } = await supabase.functions.invoke('update-client-discount', {
        body: {
          tenant_id: tenantId,
          client_user_id: data.id,
          trade_discount: (data.commission_rate ?? 0) * 100,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to update client trade discount')
      }

      if (result?.error) {
        throw new Error(result.error)
      }

      const client = (result as UpdateClientDiscountResult | null)?.client
      if (!client) {
        throw new Error('Client profile not found in the current workspace')
      }

      return client as Client
    },
    onSuccess: (data, variables) => {
      // Invalidate client queries
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'clients', data.id] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'profiles'] })
      
      // If commission_rate was updated, invalidate product queries and notify the user
      if (variables.commission_rate !== undefined) {
        // Invalidate all product queries so adjusted prices are recalculated
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'products'] })
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'public-products'] })
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'product'] })
        // Also invalidate quotes so they show updated pricing
        queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'quotes'] })

        // Notify the affected company user about the commission change
        sendNotification({
          type: 'commission_changed',
          metadata: {
            commission_rate: Math.round(variables.commission_rate * 100),
          },
          targetAudience: 'user',
          targetUserId: data.id,
        })
      }
    },
  })
}

export function useMutationDeleteClient() {
  const queryClient = useQueryClient()
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useMutation({
    mutationFn: async (clientId: string) => {
      if (!tenantId) {
        throw new Error('Missing tenant context')
      }
      const { data: result, error } = await supabase.functions.invoke('revoke-client-access', {
        body: {
          tenant_id: tenantId,
          client_user_id: clientId,
        },
      })

      if (error) {
        throw new Error(error.message || 'Failed to revoke client access')
      }
      if (result?.error) {
        throw new Error(result.error)
      }
      return clientId
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'clients'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'profiles'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'invitations'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId, 'tenant-memberships'] })
    },
  })
}
