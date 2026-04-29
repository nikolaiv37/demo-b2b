import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { Client } from '@/types'
import { useTenant } from '@/lib/tenant/TenantProvider'

interface QuoteCompanyRow {
  user_id?: string | null
  company_name?: string | null
  email?: string | null
  created_at?: string | null
  status?: string | null
  total?: string | number | null
}

export function useQueryClients() {
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  return useQuery({
    queryKey: ['tenant', tenantId, 'clients'],
    queryFn: async () => {
      if (!tenantId) return []

      // Tenant membership is the source of truth for client/admin/owner access.
      // We still show pending invited client profiles (no membership yet), but
      // must exclude owner/admin accounts even if a profile role was left as
      // 'company' by older data or edge-case onboarding flows.
      const { data: memberships, error: membershipsError } = await supabase
        .from('tenant_memberships')
        .select('user_id, role')
        .eq('tenant_id', tenantId)

      if (membershipsError) throw membershipsError

      const membershipRoleByUserId = new Map<string, string>(
        (memberships || [])
          .filter((m) => !!m.user_id)
          .map((m) => [m.user_id as string, m.role as string])
      )

      const memberUserIds = Array.from(
        new Set(
          (memberships || [])
            .filter((membership) => membership?.role === 'member' && membership?.user_id)
            .map((membership) => membership.user_id as string)
        )
      )

      const { data: quoteCompanies, error: quotesError } = await supabase
        .from('quotes')
        .select('user_id, company_name, email, created_at, status, total')
        .not('user_id', 'is', null)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (quotesError) {
        console.error('Failed to fetch quote company data for clients:', quotesError)
      }

      const companyByUserId = new Map<
        string,
        {
          company_name?: string | null
          email?: string | null
          created_at?: string | null
          orders_count: number
          unpaid_amount: number
        }
      >()

      ;((quoteCompanies as QuoteCompanyRow[] | null) || []).forEach((quote) => {
        const userId = quote.user_id || null
        if (!userId) return

        const isUnpaid = ['new', 'pending'].includes(quote.status || '')
        const total = Number(quote.total || 0)
        const existing = companyByUserId.get(userId)

        if (!existing) {
          companyByUserId.set(userId, {
            company_name: quote.company_name || null,
            email: quote.email || null,
            created_at: quote.created_at || null,
            orders_count: 1,
            unpaid_amount: isUnpaid ? total : 0,
          })
        } else {
          existing.orders_count += 1
          if (isUnpaid) {
            existing.unpaid_amount += total
          }
        }
      })

      const candidateUserIds = Array.from(
        new Set([...memberUserIds, ...companyByUserId.keys()])
      )

      const memberProfilesResult = candidateUserIds.length > 0
        ? await supabase
            .from('profiles')
            .select('*')
            .in('id', candidateUserIds)
            .order('created_at', { ascending: false })
        : { data: [], error: null }

      if (memberProfilesResult.error) throw memberProfilesResult.error

      const invitedProfilesResult = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('invitation_status', 'invited')
        .order('created_at', { ascending: false })

      if (invitedProfilesResult.error) throw invitedProfilesResult.error

      const profiles = Array.from(
        new Map(
          [...(memberProfilesResult.data || []), ...(invitedProfilesResult.data || [])]
            .map((profile) => [profile.id, profile as Client])
        ).values()
      )
      const profileById = new Map(profiles.map((profile) => [profile.id, profile]))

      const activeClients = candidateUserIds
        .filter((userId) => {
          const membershipRole = membershipRoleByUserId.get(userId)
          return membershipRole ? membershipRole === 'member' : companyByUserId.has(userId)
        })
        .map((userId) => {
          const profile = profileById.get(userId)
          const quoteHint = companyByUserId.get(userId)

          return {
            id: userId,
            role: 'company',
            full_name: profile?.full_name || quoteHint?.company_name || null,
            company_name: profile?.company_name || quoteHint?.company_name || null,
            email: profile?.email || quoteHint?.email || null,
            phone: profile?.phone || null,
            company_id: profile?.company_id || null,
            commission_rate: profile?.commission_rate ?? null,
            invitation_status: profile?.invitation_status || 'active',
            created_at: profile?.created_at || quoteHint?.created_at || new Date().toISOString(),
            updated_at: profile?.updated_at || quoteHint?.created_at || new Date().toISOString(),
            orders_count: quoteHint?.orders_count || 0,
            unpaid_amount: quoteHint?.unpaid_amount || 0,
          } as Client
        })

      const pendingInvitedClients = profiles.filter((profile) => {
        const membershipRole = membershipRoleByUserId.get(profile.id)

        if (membershipRole) {
          return false
        }

        return profile.invitation_status === 'invited'
      })

      const baseClients = Array.from(
        new Map(
          [...activeClients, ...pendingInvitedClients].map((profile) => [profile.id, profile])
        ).values()
      )

      if (!baseClients.length) {
        return baseClients
      }

      const enriched = baseClients.map((client) => {
        const hint = companyByUserId.get(client.id)
        if (!hint) return client

        return {
          ...client,
          company_name: client.company_name || hint.company_name || null,
          email: client.email || hint.email || null,
          orders_count: hint.orders_count,
          unpaid_amount: hint.unpaid_amount,
        }
      })

      return enriched
    },
    staleTime: 30 * 1000,
    enabled: !!tenantId,
  })
}

/** Fetch pending invitations for the current tenant (admin only) */
export function useQueryInvitations() {
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  return useQuery({
    queryKey: ['tenant', tenantId, 'invitations'],
    queryFn: async () => {
      if (!tenantId) return []
      const { data, error } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 30 * 1000,
    enabled: !!tenantId,
  })
}

export function useQueryClient(clientId: string) {
  const { tenant } = useTenant()
  const tenantId = tenant?.id
  return useQuery({
    queryKey: ['tenant', tenantId, 'clients', clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clientId)
        .eq('tenant_id', tenantId)
        .single()

      if (error) throw error
      return data as Client
    },
    enabled: !!clientId && !!tenantId,
  })
}
