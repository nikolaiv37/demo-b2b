import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Client } from '@/types'

export function useQueryClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      // Base: all company-role profiles (B2B clients)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'company')
        .order('created_at', { ascending: false })

      if (profilesError) throw profilesError

      const baseClients = (profiles || []) as Client[]

      if (!baseClients.length) {
        return baseClients
      }

      // Enrich with latest company_name/email from quotes (same source as Orders page)
      const { data: quoteCompanies, error: quotesError } = await supabase
        .from('quotes')
        .select('user_id, company_name, email, created_at')
        .not('user_id', 'is', null)
        .order('created_at', { ascending: false })

      if (quotesError) {
        // Fail gracefully: still return base clients if quotes lookup fails
        console.error('Failed to fetch quote company data for clients:', quotesError)
        return baseClients
      }

      const companyByUserId = new Map<
        string,
        { company_name?: string | null; email?: string | null; orders_count: number }
      >()

      ;(quoteCompanies || []).forEach((quote: any) => {
        const userId = quote.user_id as string | null
        if (!userId) return

        const existing = companyByUserId.get(userId)

        // Because we ordered DESC by created_at, first hit per user_id is the latest
        if (!existing) {
          companyByUserId.set(userId, {
            company_name: quote.company_name || null,
            email: quote.email || null,
            orders_count: 1,
          })
        } else {
          existing.orders_count += 1
        }
      })

      const enriched = baseClients.map((client) => {
        const hint = companyByUserId.get(client.id)
        if (!hint) return client

        return {
          ...client,
          company_name: client.company_name || hint.company_name || null,
          email: client.email || hint.email || null,
          orders_count: hint.orders_count,
        }
      })

      return enriched
    },
    staleTime: 30 * 1000,
  })
}

export function useQueryClient(clientId: string) {
  return useQuery({
    queryKey: ['clients', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .eq('role', 'company')
        .single()

      if (error) throw error
      return data as Client
    },
    enabled: !!clientId,
  })
}


