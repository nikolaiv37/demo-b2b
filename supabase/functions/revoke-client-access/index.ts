import { requireTenantAuth } from '../_shared/auth.ts'
import { errorResponse, HttpError, ok, parseJson, requirePostOrOptions } from '../_shared/http.ts'

interface RevokeClientAccessBody {
  tenant_id?: string
  client_user_id?: string
}

Deno.serve(async (req) => {
  const preflight = requirePostOrOptions(req)
  if (preflight) {
    return preflight
  }

  try {
    const body = await parseJson<RevokeClientAccessBody>(req)
    const tenantId = body.tenant_id?.trim()
    const clientUserId = body.client_user_id?.trim()

    if (!tenantId) {
      throw new HttpError(400, 'tenant_id is required')
    }

    if (!clientUserId) {
      throw new HttpError(400, 'client_user_id is required')
    }

    const auth = await requireTenantAuth(req, { tenantId, requireAdmin: true })
    const { adminClient } = auth

    const { data: membership, error: membershipError } = await adminClient
      .from('tenant_memberships')
      .select('user_id, tenant_id, role')
      .eq('tenant_id', tenantId)
      .eq('user_id', clientUserId)
      .maybeSingle()

    if (membershipError) {
      throw new HttpError(500, 'Failed to inspect client membership')
    }

    if (!membership) {
      throw new HttpError(404, 'Client membership not found in the current workspace')
    }

    if (membership.role !== 'member') {
      throw new HttpError(409, 'Only client memberships can be revoked')
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, tenant_id')
      .eq('id', clientUserId)
      .maybeSingle()

    if (profileError) {
      throw new HttpError(500, 'Failed to inspect client profile')
    }

    const { error: deleteMembershipError } = await adminClient
      .from('tenant_memberships')
      .delete()
      .eq('tenant_id', tenantId)
      .eq('user_id', clientUserId)
      .eq('role', 'member')

    if (deleteMembershipError) {
      throw new HttpError(500, 'Failed to revoke client membership')
    }

    const { count: remainingMemberships, error: remainingMembershipsError } = await adminClient
      .from('tenant_memberships')
      .select('user_id', { count: 'exact', head: true })
      .eq('user_id', clientUserId)

    if (remainingMembershipsError) {
      throw new HttpError(500, 'Failed to inspect remaining memberships')
    }

    if (profile?.tenant_id === tenantId && (remainingMemberships ?? 0) === 0) {
      const { error: clearProfileError } = await adminClient
        .from('profiles')
        .update({ tenant_id: null })
        .eq('id', clientUserId)

      if (clearProfileError) {
        console.error('revoke-client-access profile cleanup failed', {
          message: clearProfileError.message,
          code: clearProfileError.code,
          details: clearProfileError.details,
          hint: clearProfileError.hint,
          user_id: clientUserId,
          tenant_id: tenantId,
        })
      }
    }

    return ok({
      success: true,
      client_user_id: clientUserId,
      tenant_id: tenantId,
      action: 'membership_revoked',
    })
  } catch (error) {
    console.error('revoke-client-access error:', error)
    return errorResponse(error)
  }
})
