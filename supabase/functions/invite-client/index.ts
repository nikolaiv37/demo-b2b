// supabase/functions/invite-client/index.ts
//
// Edge Function: invite-client
// Called by tenant admins to invite a new client company.
//
// POST body: { email, company_name?, commission_rate?, tenant_id }
//
// Flow:
//   1. Validate caller is admin/owner of the tenant
//   2. Create (or update) the tenant_invitations record → get token
//   3. Invite user via Supabase Auth with token in redirectTo
//   4. Create stub profile + membership
//   5. Return the invitation record

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { email, company_name, commission_rate, tenant_id } = body

    if (!email || !tenant_id) {
      return new Response(
        JSON.stringify({ error: 'email and tenant_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify caller identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Admin client (service role — bypasses RLS)
    const adminClient = createClient(supabaseUrl, serviceRoleKey)

    // Verify caller is admin/owner
    const { data: membership } = await adminClient
      .from('tenant_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return new Response(JSON.stringify({ error: 'Only tenant admins can invite clients' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Commission as decimal 0.00–0.50
    const commissionDecimal = commission_rate
      ? Math.min(Math.max(Number(commission_rate) / 100, 0), 0.5)
      : 0

    // ── Step 1: Create / update invitation record FIRST (to get the token) ──

    const { data: existingInvite } = await adminClient
      .from('tenant_invitations')
      .select('id, status, token')
      .eq('tenant_id', tenant_id)
      .eq('email', normalizedEmail)
      .single()

    if (existingInvite?.status === 'accepted') {
      return new Response(
        JSON.stringify({ error: 'This email has already accepted an invitation' }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let invitation: { id: string; token: string; [k: string]: unknown } | null = null

    const invitationPayload = {
      tenant_id,
      email: normalizedEmail,
      company_name: company_name || null,
      commission_rate: commissionDecimal,
      invited_by: user.id,
      status: 'pending' as const,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }

    if (existingInvite) {
      // Resend — update but keep token
      const { data, error } = await adminClient
        .from('tenant_invitations')
        .update({
          ...invitationPayload,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', existingInvite.id)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: `Failed to update invitation: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      invitation = data
    } else {
      // New invitation
      const { data, error } = await adminClient
        .from('tenant_invitations')
        .insert(invitationPayload)
        .select()
        .single()

      if (error) {
        return new Response(
          JSON.stringify({ error: `Failed to create invitation: ${error.message}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      invitation = data
    }

    // ── Step 2: Invite user via Supabase Auth ──
    // Build redirect URL including the invitation token
    // Strip trailing slashes to avoid double-slash in the URL (e.g. https://x.com//auth)
    const rawSiteUrl = Deno.env.get('SITE_URL') || req.headers.get('origin') || supabaseUrl
    const siteUrl = rawSiteUrl.replace(/\/+$/, '')
    const redirectUrl = `${siteUrl}/auth/accept-invite?token=${invitation!.token}`

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      normalizedEmail,
      {
        redirectTo: redirectUrl,
        data: {
          tenant_id,
          role: 'company',
          company_name: company_name || null,
          invitation_token: invitation!.token,
        },
      }
    )

    if (inviteError) {
      console.error('inviteUserByEmail error:', inviteError)
      // Don't fail entirely — the invitation record exists, admin can share the link manually
      console.warn('Auth invite email failed, but invitation record was created.')
    }

    // ── Step 3: Create stub profile + membership ──
    const authUserId = inviteData?.user?.id
    let profileId: string | null = null

    if (authUserId) {
      // Create / update profile
      const { data: profileData, error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          id: authUserId,
          email: normalizedEmail,
          role: 'company',
          company_name: company_name || null,
          commission_rate: commissionDecimal,
          invitation_status: 'invited',
          tenant_id,
        }, { onConflict: 'id' })
        .select('id')
        .single()

      if (profileError) {
        console.error('Profile upsert error:', profileError)
      } else {
        profileId = profileData?.id ?? null
      }

      // Ensure tenant membership
      const { error: membershipError } = await adminClient
        .from('tenant_memberships')
        .upsert({
          user_id: authUserId,
          tenant_id,
          role: 'member',
        }, { onConflict: 'user_id,tenant_id' })

      if (membershipError) {
        console.error('Membership upsert error:', membershipError)
      }

      // Link profile to invitation
      if (profileId) {
        await adminClient
          .from('tenant_invitations')
          .update({ profile_id: profileId })
          .eq('id', invitation!.id)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        profile_id: profileId,
        email_sent: !inviteError,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
