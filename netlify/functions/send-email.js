const { Resend } = require('resend')

const resend = new Resend(process.env.RESEND_API_KEY)

const BUSINESS_NAME = process.env.BUSINESS_NAME || 'YourBusiness'

const TEMPLATES = {
  booking_submitted: (d) => ({
    subject: `Your booking is pending — ${d.referenceCode}`,
    html: `<p>Hi ${d.customerName},</p><p>Your booking (${d.referenceCode}) has been received. Please upload your payment slip to proceed. You have <strong>24 hours</strong> before the slot is released.</p><p>— ${BUSINESS_NAME}</p>`,
  }),
  booking_confirmed: (d) => ({
    subject: `You're booked! — ${d.referenceCode}`,
    html: `<p>Hi ${d.customerName},</p><p>Your booking (${d.referenceCode}) on <strong>${d.date}</strong> at <strong>${d.slot}</strong> has been <strong>confirmed</strong>. We look forward to seeing you!</p><p>— ${BUSINESS_NAME}</p>`,
  }),
  booking_rejected: (d) => ({
    subject: `Booking update — ${d.referenceCode}`,
    html: `<p>Hi ${d.customerName},</p><p>Unfortunately your booking (${d.referenceCode}) could not be confirmed. Reason: ${d.reason}. Please contact us to reschedule.</p>`,
  }),
  booking_expired: (d) => ({
    subject: `Your booking expired — ${d.referenceCode}`,
    html: `<p>Hi ${d.customerName},</p><p>Your booking (${d.referenceCode}) has expired as no payment slip was received within 24 hours. Please book again if you'd still like an appointment.</p>`,
  }),
  waitlist_notify: (d) => ({
    subject: `A slot just opened — claim it!`,
    html: `<p>Hi ${d.customerName},</p><p>Great news! A slot opened up for <strong>${d.date}</strong> at <strong>${d.slot}</strong>. You have <strong>6 hours</strong> to claim it.</p>`,
  }),
  review_request: (d) => ({
    subject: `How was your experience?`,
    html: `<p>Hi ${d.customerName},</p><p>We hope you enjoyed your appointment! We'd appreciate a quick review. <a href="${d.reviewUrl}">Leave a review here</a>.</p>`,
  }),
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' }

  const { to, template, data } = JSON.parse(event.body)
  const tmpl = TEMPLATES[template]?.(data) || { subject: 'Notification', html: `<p>Update from ${BUSINESS_NAME}</p>` }

  try {
    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL,
      to,
      ...tmpl,
    })
    return { statusCode: 200, body: JSON.stringify({ ok: true }) }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) }
  }
}
