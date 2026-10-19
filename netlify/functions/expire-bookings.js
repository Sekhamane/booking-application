const { createClient } = require('@supabase/supabase-js')

exports.handler = async () => {
  const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data: expired } = await supabase
    .from('bookings')
    .select('id, reference_code, customers(email, name)')
    .eq('status', 'pending_slip')
    .lt('created_at', cutoff)

  if (!expired?.length) return { statusCode: 200, body: JSON.stringify({ expired: 0 }) }

  const ids = expired.map(b => b.id)
  await supabase.from('bookings').update({ status: 'expired', updated_at: new Date() }).in('id', ids)

  // Trigger expiry emails via send-email function
  for (const b of expired) {
    await fetch(`${process.env.VITE_APP_URL}/.netlify/functions/send-email`, {
      method: 'POST',
      body: JSON.stringify({
        to: b.customers?.email,
        template: 'booking_expired',
        data: { customerName: b.customers?.name, referenceCode: b.reference_code },
      }),
    }).catch(() => {})
  }

  return { statusCode: 200, body: JSON.stringify({ expired: ids.length }) }
}
