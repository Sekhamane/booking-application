import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405, headers: cors })
  try {
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
    if (!token) return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors })
    const url = Deno.env.get('SUPABASE_URL')!
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const userDb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const { data: { user } } = await userDb.auth.getUser(token)
    if (!user) return Response.json({ error: 'Sign in required' }, { status: 401, headers: cors })
    const { data: profile } = await userDb.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'security_admin') return Response.json({ error: 'Security administrator access required' }, { status: 403, headers: cors })

    const body = await request.json()
    const requestId = body?.request_id
    const adminNotes = typeof body?.admin_notes === 'string' ? body.admin_notes.slice(0, 2000).trim() : ''
    if (typeof requestId !== 'string' || !adminNotes) return Response.json({ error: 'Request ID and processing notes are required' }, { status: 400, headers: cors })
    const adminDb = createClient(url, service)
    const { data: privacyRequest, error: requestError } = await adminDb.from('privacy_requests').select('*')
      .eq('id', requestId).maybeSingle()
    if (requestError || !privacyRequest || privacyRequest.request_type !== 'deletion') {
      return Response.json({ error: 'Deletion request not found' }, { status: 404, headers: cors })
    }
    if (!['pending', 'processing'].includes(privacyRequest.status)) return Response.json({ error: 'Request is already closed' }, { status: 409, headers: cors })
    if (!privacyRequest.profile_id) {
      if (privacyRequest.status !== 'processing') return Response.json({ error: 'Deletion target is unavailable' }, { status: 409, headers: cors })
      const { error } = await adminDb.from('privacy_requests').update({ status: 'completed', completed_at: new Date().toISOString(),
        admin_notes: `${adminNotes}\nProcessing resumed: account credentials were already removed after linked records were anonymized.` }).eq('id', requestId)
      if (error) throw error
      return Response.json({ ok: true, resumed: true }, { headers: cors })
    }
    if (privacyRequest.status !== 'processing') {
      const { error } = await adminDb.from('privacy_requests').update({ status: 'processing', admin_notes: adminNotes }).eq('id', requestId)
      if (error) throw error
    } else {
      const { error } = await adminDb.from('privacy_requests').update({ admin_notes: adminNotes }).eq('id', requestId)
      if (error) throw error
    }
    const targetId = privacyRequest.profile_id
    const { data: authData, error: authError } = await adminDb.auth.admin.getUserById(targetId)
    if (authError || !authData.user) return Response.json({ error: 'Account was already removed' }, { status: 409, headers: cors })
    const oldEmail = authData.user.email || ''
    const { data: byProfile, error: profileCustomerError } = await adminDb.from('customers').select('id, payment_slip_url').eq('profile_id', targetId)
    if (profileCustomerError) throw profileCustomerError
    const { data: byEmail, error: emailCustomerError } = oldEmail
      ? await adminDb.from('customers').select('id, payment_slip_url').eq('email', oldEmail)
      : { data: [], error: null }
    if (emailCustomerError) throw emailCustomerError
    const customers = [...new Map([...(byProfile || []), ...(byEmail || [])].map(customer => [customer.id, customer])).values()]
    const customerIds = customers.map(customer => customer.id)
    const anonymizedName = `Former customer ${targetId.slice(0, 8)}`
    const anonymizedPhone = `deleted-${targetId}`

    // Remove legacy private payment slip objects when the stored URL belongs to this bucket.
    const paths = (customers || []).map(customer => {
      const marker = '/storage/v1/object/public/payment-slips/'
      const privateMarker = '/storage/v1/object/payment-slips/'
      const signedMarker = '/storage/v1/object/sign/payment-slips/'
      const urlValue = customer.payment_slip_url || ''
      const markerIndex = Math.max(urlValue.indexOf(marker), urlValue.indexOf(privateMarker), urlValue.indexOf(signedMarker))
      if (markerIndex < 0) return null
      const selectedMarker = urlValue.includes(signedMarker) ? signedMarker : urlValue.includes(marker) ? marker : privateMarker
      const rawPath = urlValue.slice(markerIndex + selectedMarker.length).split(/[?#]/, 1)[0]
      try { return decodeURIComponent(rawPath) } catch { return rawPath }
    }).filter(Boolean)
    if (paths.length) {
      const { error } = await adminDb.storage.from('payment-slips').remove(paths)
      if (error) throw error
    }

    if (customerIds.length) {
      let result = await adminDb.from('reminder_queue').delete().in('customer_id', customerIds)
      if (result.error) throw result.error
      result = await adminDb.from('testimonials').update({ customer_name: 'Former customer', review_text: null }).in('customer_id', customerIds)
      if (result.error) throw result.error
      result = await adminDb.from('bookings').update({ customer_notes: null, design_inspiration: null, inspiration_image_url: null,
        payment_slip_url: null, payment_slip_uploaded_at: null, admin_notes: null }).in('customer_id', customerIds)
      if (result.error) throw result.error
      for (const customer of customers) {
        result = await adminDb.from('customers').update({ name: anonymizedName, email: `deleted+${customer.id}@invalid.example`, phone: `${anonymizedPhone}-${customer.id.slice(0, 8)}`,
          preferred_language: 'en', occasion_dates: [], notes: null, total_bookings: 0, is_recurring: false, profile_id: null,
          updated_at: new Date().toISOString() }).eq('id', customer.id)
        if (result.error) throw result.error
      }
    }
    const anonymizedEmail = `deleted+${targetId}@invalid.example`
    if (oldEmail) {
      let result = await adminDb.from('consultations').update({ name: 'Former customer', phone: 'removed', email: anonymizedEmail,
        message: null, inspiration_image_url: null, admin_response: null }).eq('email', oldEmail)
      if (result.error) throw result.error
      result = await adminDb.from('gift_vouchers').update({ purchaser_name: 'Former customer', purchaser_email: anonymizedEmail,
        payment_slip_url: null, pdf_url: null }).eq('purchaser_email', oldEmail)
      if (result.error) throw result.error
      result = await adminDb.from('gift_vouchers').update({ recipient_name: 'Former customer', recipient_email: anonymizedEmail, pdf_url: null })
        .eq('recipient_email', oldEmail)
      if (result.error) throw result.error
    }
    const { error: profileUpdateError } = await adminDb.from('profiles').update({ full_name: 'Former customer', email: anonymizedEmail, phone: null,
      marketing_consent_at: null, updated_at: new Date().toISOString() }).eq('id', targetId)
    if (profileUpdateError) throw profileUpdateError

    const { error: auditError } = await adminDb.from('audit_logs').insert({ actor_id: user.id, action: 'privacy.deletion_processed', resource_type: 'privacy_request', resource_id: requestId })
    if (auditError) throw auditError

    const { error: deleteError } = await adminDb.auth.admin.deleteUser(targetId)
    if (deleteError) throw deleteError
    const { error: completionError } = await adminDb.from('privacy_requests').update({ profile_id: null, status: 'completed', completed_at: new Date().toISOString(),
      admin_notes: `${adminNotes}\nProcessing: account credentials removed; linked customer and booking contact fields anonymized; legacy payment slips removed where present.` }).eq('id', requestId)
    if (completionError) throw completionError
    return Response.json({ ok: true }, { headers: cors })
  } catch (error) {
    console.error('Unable to process privacy deletion', error)
    return Response.json({ error: 'Deletion processing failed; review the request and retry safely.' }, { status: 500, headers: cors })
  }
})
