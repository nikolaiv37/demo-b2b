import { requireTenantAuth } from '../_shared/auth.ts'
import { errorResponse, HttpError, ok, parseJson, requirePostOrOptions } from '../_shared/http.ts'

interface UpdateClientDiscountBody {
  tenant_id?: string
  client_user_id?: string
  trade_discount?: number
}

function validateTradeDiscountPercent(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 50) {
    throw new HttpError(400, 'Trade discount must be between 0 and 50')
  }

  return Number((value / 100).toFixed(4))
}

Deno.serve(async (req) => {
  const preflight = requirePostOrOptions(req)
  if (preflight) {
    return preflight
  }

  try {
    const body = await parseJson<UpdateClientDiscountBody>(req)
    const tenantId = body.tenant_id?.trim()
    const clientUserId = body.client_user_id?.trim()

    if (!tenantId) {
      throw new HttpError(400, 'tenant_id is required')
    }

    if (!clientUserId) {
      throw new HttpError(400, 'client_user_id is required')
    }

    const commissionRate = validateTradeDiscountPercent(Number(body.trade_discount ?? 0))

    const auth = await requireTenantAuth(req, { tenantId, requireAdmin: true })
    const { adminClient } = auth

    const { data: membership, error: membershipError } = await adminClient
      .from('tenant_memberships')
      .select('role')
      .eq('tenant_id', tenantId)
      .eq('user_id', clientUserId)
      .maybeSingle()

    if (membershipError) {
      throw new HttpError(500, 'Failed to inspect client membership')
    }

    if (membership?.role && membership.role !== 'member') {
      throw new HttpError(409, 'Only client memberships can be updated')
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, email, role, tenant_id, is_platform_admin')
      .eq('id', clientUserId)
      .maybeSingle()

    if (profileError) {
      throw new HttpError(500, 'Failed to inspect client profile')
    }

    if (!profile) {
      throw new HttpError(404, 'Client profile not found')
    }

    if (profile.is_platform_admin) {
      throw new HttpError(409, 'Platform admins cannot be updated as clients')
    }

    if (!['buyer', 'company'].includes(profile.role || '')) {
      throw new HttpError(409, 'Only client profiles can be updated')
    }

    const belongsToTenant =
      membership?.role === 'member' || profile.tenant_id === tenantId

    if (!belongsToTenant) {
      throw new HttpError(404, 'Client profile not found in the current workspace')
    }

    const { data: updatedProfile, error: updateError } = await adminClient
      .from('profiles')
      .update({
        commission_rate: commissionRate,
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientUserId)
      .select('id, email, commission_rate')
      .maybeSingle()

    if (updateError) {
      throw new HttpError(500, 'Failed to update client trade discount')
    }

    if (!updatedProfile) {
      throw new HttpError(404, 'Client profile not found in the current workspace')
    }

    return ok({
      success: true,
      client: {
        id: updatedProfile.id,
        email: updatedProfile.email,
        commission_rate: updatedProfile.commission_rate,
      },
    })
  } catch (error) {
    console.error('update-client-discount error:', error)
    return errorResponse(error)
  }
})
