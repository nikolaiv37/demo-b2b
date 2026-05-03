import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { requireTenantAuth } from '../_shared/auth.ts'
import { errorResponse, HttpError, ok, parseJson, requirePostOrOptions } from '../_shared/http.ts'

interface CreateClientManualBody {
  tenant_id?: string
  email?: string
  company_name?: string
  commission_rate?: number
  temporary_password?: string
}

interface CompanyRow {
  id: string
  name: string
  slug: string
}

const CLIENT_PROFILE_ROLE = 'buyer'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateTradeDiscount(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 50) {
    throw new HttpError(400, 'Trade discount must be between 0 and 50')
  }

  return Number((value / 100).toFixed(4))
}

async function listAuthUsersByEmail(
  adminClient: ReturnType<typeof createClient>,
  email: string,
) {
  const { data, error } = await adminClient.auth.admin.listUsers()
  if (error) {
    throw new HttpError(500, 'Failed to inspect existing users')
  }

  return (data.users || []).filter((user) => user.email?.toLowerCase() === email)
}

async function ensureUniqueCompanySlug(
  adminClient: ReturnType<typeof createClient>,
  tenantId: string,
  companyName: string,
  existingCompanyId?: string | null,
): Promise<string> {
  const base = slugify(companyName) || 'client-company'

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`
    const { data, error } = await adminClient
      .from('companies')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('slug', candidate)
      .limit(1)

    if (error) {
      throw new HttpError(500, 'Failed to validate company slug')
    }

    if (!data?.length || data[0].id === existingCompanyId) {
      return candidate
    }
  }

  throw new HttpError(500, 'Failed to generate a unique company slug')
}

async function resolveCompany(params: {
  adminClient: ReturnType<typeof createClient>
  tenantId: string
  companyName: string
  existingCompanyId?: string | null
}) {
  const { adminClient, tenantId, companyName, existingCompanyId } = params
  const normalizedName = companyName.trim().toLowerCase()

  if (existingCompanyId) {
    const { data: existingCompany, error } = await adminClient
      .from('companies')
      .select('id, name, slug')
      .eq('id', existingCompanyId)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    if (error) {
      throw new HttpError(500, 'Failed to inspect existing company')
    }

    if (existingCompany) {
      return existingCompany as CompanyRow
    }
  }

  const { data: tenantCompanies, error: tenantCompaniesError } = await adminClient
    .from('companies')
    .select('id, name, slug')
    .eq('tenant_id', tenantId)
    .ilike('name', companyName.trim())
    .limit(5)

  if (tenantCompaniesError) {
    throw new HttpError(500, 'Failed to search tenant companies')
  }

  const matchedCompany = (tenantCompanies || []).find(
    (company) => company.name.trim().toLowerCase() === normalizedName,
  )

  if (matchedCompany) {
    return matchedCompany as CompanyRow
  }

  const slug = await ensureUniqueCompanySlug(adminClient, tenantId, companyName)
  const { data: createdCompany, error: createCompanyError } = await adminClient
    .from('companies')
    .insert({
      tenant_id: tenantId,
      name: companyName.trim(),
      slug,
      onboarding_completed: true,
    })
    .select('id, name, slug')
    .single()

  if (createCompanyError || !createdCompany) {
    throw new HttpError(500, 'Failed to create client company')
  }

  return createdCompany as CompanyRow
}

Deno.serve(async (req) => {
  const preflight = requirePostOrOptions(req)
  if (preflight) {
    return preflight
  }

  try {
    const body = await parseJson<CreateClientManualBody>(req)
    const tenantId = body.tenant_id?.trim()
    const email = normalizeEmail(body.email || '')
    const companyName = body.company_name?.trim() || ''
    const temporaryPassword = body.temporary_password?.trim() || ''

    if (!tenantId) {
      throw new HttpError(400, 'tenant_id is required')
    }
    if (!email) {
      throw new HttpError(400, 'Email is required')
    }
    if (!isValidEmail(email)) {
      throw new HttpError(400, 'Please enter a valid email address')
    }
    if (!companyName) {
      throw new HttpError(400, 'Company name is required')
    }
    if (companyName.length > 120) {
      throw new HttpError(400, 'Company name is too long')
    }
    if (!temporaryPassword) {
      throw new HttpError(400, 'Temporary password is required')
    }
    if (temporaryPassword.length < 6) {
      throw new HttpError(400, 'Temporary password must be at least 6 characters')
    }

    const commissionRate = validateTradeDiscount(Number(body.commission_rate ?? 0))
    const auth = await requireTenantAuth(req, { tenantId, requireAdmin: true })
    const { adminClient } = auth

    const { data: pendingInvitations, error: pendingInvitationsError } = await adminClient
      .from('tenant_invitations')
      .select('id, target_role, status')
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .limit(5)

    if (pendingInvitationsError) {
      throw new HttpError(500, 'Failed to inspect existing invitations')
    }

    const pendingAdminInvite = (pendingInvitations || []).find(
      (invitation) => invitation.status === 'pending' && invitation.target_role === 'admin',
    )

    if (pendingAdminInvite) {
      throw new HttpError(409, 'This email already has a pending team invitation in this workspace.')
    }

    const matchedUsers = await listAuthUsersByEmail(adminClient, email)
    const existingUser = matchedUsers[0] || null

    if (existingUser) {
      const { data: memberships, error: membershipsError } = await adminClient
        .from('tenant_memberships')
        .select('tenant_id, role')
        .eq('user_id', existingUser.id)
        .limit(5)

      if (membershipsError) {
        throw new HttpError(500, 'Failed to inspect existing memberships')
      }

      const membershipInCurrentTenant = (memberships || []).find(
        (membership) => membership.tenant_id === tenantId,
      )

      if (membershipInCurrentTenant) {
        throw new HttpError(409, 'This client already has access to the current workspace.')
      }

      const membershipInAnotherTenant = (memberships || []).find(
        (membership) => membership.tenant_id !== tenantId,
      )

      if (membershipInAnotherTenant) {
        throw new HttpError(409, 'This email already belongs to another workspace.')
      }
    }

    let authUserId = existingUser?.id ?? null

    if (!existingUser) {
      const { data: createdUser, error: createUserError } = await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          company_name: companyName,
          role: CLIENT_PROFILE_ROLE,
          tenant_id: tenantId,
        },
      })

      if (createUserError || !createdUser.user?.id) {
        throw new HttpError(500, createUserError?.message || 'Failed to create auth user')
      }

      authUserId = createdUser.user.id
    } else {
      const { error: updateUserError } = await adminClient.auth.admin.updateUserById(existingUser.id, {
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: {
          ...(existingUser.user_metadata || {}),
          company_name: companyName,
          role: CLIENT_PROFILE_ROLE,
          tenant_id: tenantId,
        },
      })

      if (updateUserError) {
        throw new HttpError(500, updateUserError.message || 'Failed to update auth user')
      }

      authUserId = existingUser.id
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('id, company_id')
      .eq('id', authUserId)
      .maybeSingle()

    if (existingProfileError) {
      throw new HttpError(500, 'Failed to inspect existing profile')
    }

    const company = await resolveCompany({
      adminClient,
      tenantId,
      companyName,
      existingCompanyId: existingProfile?.company_id ?? null,
    })

    const { error: profileError } = await adminClient
      .from('profiles')
      .upsert(
        {
          id: authUserId,
          email,
          role: CLIENT_PROFILE_ROLE,
          company_id: company.id,
          commission_rate: commissionRate,
          invitation_status: 'active',
          tenant_id: tenantId,
        },
        { onConflict: 'id' },
      )

    if (profileError) {
      console.error('create-client-manual profile upsert failed', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        user_id: authUserId,
        tenant_id: tenantId,
        attempted_role: CLIENT_PROFILE_ROLE,
      })
      throw new HttpError(500, 'Failed to create client profile')
    }

    const { error: syncUserMetadataError } = await adminClient.auth.admin.updateUserById(authUserId, {
      email,
      user_metadata: {
        ...(existingUser?.user_metadata || {}),
        company_name: company.name,
        role: CLIENT_PROFILE_ROLE,
        tenant_id: tenantId,
      },
    })

    if (syncUserMetadataError) {
      console.error('create-client-manual user metadata sync failed', {
        message: syncUserMetadataError.message,
        code: syncUserMetadataError.code,
        user_id: authUserId,
        tenant_id: tenantId,
      })
    }

    const { error: membershipError } = await adminClient
      .from('tenant_memberships')
      .upsert(
        {
          user_id: authUserId,
          tenant_id: tenantId,
          role: 'member',
        },
        { onConflict: 'user_id,tenant_id' },
      )

    if (membershipError) {
      throw new HttpError(500, 'Failed to create tenant membership')
    }

    const { error: invitationUpdateError } = await adminClient
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        profile_id: authUserId,
      })
      .eq('tenant_id', tenantId)
      .eq('email', email)
      .eq('status', 'pending')

    if (invitationUpdateError) {
      throw new HttpError(500, 'Failed to finalize existing invitation state')
    }

    return ok({
      success: true,
      client: {
        id: authUserId,
        email,
        company_name: company.name,
        company_id: company.id,
        commission_rate: commissionRate,
      },
    })
  } catch (error) {
    console.error('create-client-manual error:', error)
    return errorResponse(error)
  }
})
