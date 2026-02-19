// supabase/functions/accept-invite/index.ts
//
// Edge Function: accept-invite
// Called when an invited user completes signup and accepts their invitation.
//
// POST body: { token }
// Auth: requires valid JWT (the user who just signed up / logged in)
//
// Returns 200 with { success: true/false, error?, error_code? }
// so that supabase.functions.invoke() always puts the result in `data`.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ success: false, error: 'Not authenticated. Please log in first.', error_code: 'no_auth' })
    }

    const { token } = await req.json()
    if (!token) {
      return json({ success: false, error: 'Missing invitation token.', error_code: 'no_token' })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return json({ success: false, error: 'Session expired. Please log in again.', error_code: 'unauthorized' })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Look up invitation
    const { data: invitation, error: invError } = await adminClient
      .from('tenant_invitations')
      .select('*')
      .eq('token', token)
      .single()

    if (invError || !invitation) {
      return json({ success: false, error: 'Invitation not found. It may have been revoked.', error_code: 'not_found' })
    }

    // Get tenant info (needed for several responses)
    const { data: tenantData } = await adminClient
      .from('tenants')
      .select('slug, name')
      .eq('id', invitation.tenant_id)
      .single()

    // Check status
    if (invitation.status === 'accepted') {
      return json({
        success: false,
        error: 'This invitation has already been accepted.',
        error_code: 'already_accepted',
        tenant_slug: tenantData?.slug,
        tenant_name: tenantData?.name,
      })
    }

    if (invitation.status !== 'pending') {
      return json({
        success: false,
        error: `This invitation is ${invitation.status}.`,
        error_code: 'invalid_status',
      })
    }

    // Check expiry
    if (new Date(invitation.expires_at) < new Date()) {
      await adminClient
        .from('tenant_invitations')
        .update({ status: 'expired' })
        .eq('id', invitation.id)

      return json({
        success: false,
        error: 'This invitation has expired. Please ask the admin to resend it.',
        error_code: 'expired',
      })
    }

    // Verify email match
    if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
      return json({
        success: false,
        error: `This invitation is for ${invitation.email}. You are signed in as ${user.email}. Please sign out and use the correct account.`,
        error_code: 'email_mismatch',
        expected_email: invitation.email,
        current_email: user.email,
        tenant_name: tenantData?.name,
      })
    }

    // ── Accept the invitation ──

    // Derive roles from target_role (backward compat: null/missing = 'company')
    const targetRole = invitation.target_role || 'company'
    const isTeamInvite = targetRole === 'admin'
    const profileRole = isTeamInvite ? 'admin' : 'company'
    const membershipRole = isTeamInvite ? 'admin' : 'member'

    // Update invitation
    await adminClient
      .from('tenant_invitations')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        profile_id: user.id,
      })
      .eq('id', invitation.id)

    // Upsert profile (role synced from target_role)
    await adminClient
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email!,
        role: profileRole,
        company_name: isTeamInvite ? null : (invitation.company_name || null),
        commission_rate: isTeamInvite ? 0 : (invitation.commission_rate || 0),
        invitation_status: isTeamInvite ? 'active' : 'invited',
        tenant_id: invitation.tenant_id,
      }, { onConflict: 'id' })

    // Ensure tenant membership (role depends on invite type)
    await adminClient
      .from('tenant_memberships')
      .upsert({
        user_id: user.id,
        tenant_id: invitation.tenant_id,
        role: membershipRole,
      }, { onConflict: 'user_id,tenant_id' })

    return json({
      success: true,
      invitation_id: invitation.id,
      tenant_slug: tenantData?.slug,
      tenant_name: tenantData?.name,
    })
  } catch (err) {
    console.error('accept-invite error:', err)
    return json({
      success: false,
      error: 'An unexpected error occurred. Please try again.',
      error_code: 'internal',
    })
  }
})
