import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { useTenant } from '@/lib/tenant/TenantProvider'

export interface TeamMember {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'member'
  email: string | null
  full_name: string | null
  created_at: string
}

export function useQueryTeamMembers() {
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useQuery({
    queryKey: ['tenant', tenantId, 'team-members'],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('tenant_memberships')
        .select('id, user_id, role, created_at, profile:profiles(email, full_name)')
        .eq('tenant_id', tenantId)
        .in('role', ['owner', 'admin'])
        .order('created_at', { ascending: true })

      if (error) throw error

      return (data || []).map((row) => {
        const profile = Array.isArray(row.profile) ? row.profile[0] : row.profile
        return {
          id: row.id,
          user_id: row.user_id,
          role: row.role as TeamMember['role'],
          email: profile?.email ?? null,
          full_name: profile?.full_name ?? null,
          created_at: row.created_at,
        }
      })
    },
    staleTime: 30_000,
    enabled: !!tenantId,
  })
}

export function useQueryTeamInvitations() {
  const { tenant } = useTenant()
  const tenantId = tenant?.id

  return useQuery({
    queryKey: ['tenant', tenantId, 'team-invitations'],
    queryFn: async () => {
      if (!tenantId) return []

      const { data, error } = await supabase
        .from('tenant_invitations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('target_role', 'admin')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    staleTime: 30_000,
    enabled: !!tenantId,
  })
}
