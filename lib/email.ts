import { Resend } from 'resend'
import { env } from './env'

const getResend = (): Resend | null => {
  const key = env.resendApiKey()
  return key ? new Resend(key) : null
}

export interface SendEmailInput {
  to: string | string[]
  subject: string
  html: string
}

export const sendEmail = async (input: SendEmailInput): Promise<void> => {
  const resend = getResend()
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set; skipping email:', input.subject)
    return
  }
  try {
    await resend.emails.send({
      from: env.emailFrom(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    })
  } catch (err) {
    console.error('[email] send failed', err)
  }
}

export const bookingRequestEmail = (
  requesterName: string,
  startIso: string,
  endIso: string,
  notes: string | null,
  approveUrl: string,
  rejectUrl: string,
): { subject: string, html: string } => ({
  subject: `${requesterName} requested ${startIso} – ${endIso} on the boat`,
  html: `
    <p><strong>${requesterName}</strong> is requesting the boat from <strong>${startIso}</strong> to <strong>${endIso}</strong>.</p>
    ${notes ? `<p><em>${notes}</em></p>` : ''}
    <p>Both other owners must approve. Your call:</p>
    <p>
      <a href="${approveUrl}" style="padding:10px 16px;background:#2e7d32;color:#fff;text-decoration:none;border-radius:4px;margin-right:8px">Approve</a>
      <a href="${rejectUrl}" style="padding:10px 16px;background:#c62828;color:#fff;text-decoration:none;border-radius:4px">Reject</a>
    </p>
  `,
})

export const bookingConfirmedEmail = (
  ownerName: string,
  startIso: string,
  endIso: string,
): { subject: string, html: string } => ({
  subject: `Boat confirmed for ${ownerName}: ${startIso} – ${endIso}`,
  html: `<p><strong>${ownerName}</strong>'s booking from <strong>${startIso}</strong> to <strong>${endIso}</strong> has been confirmed by both other owners.</p>`,
})

export const bookingRejectedEmail = (
  requesterName: string,
  startIso: string,
  endIso: string,
  rejecterName: string,
): { subject: string, html: string } => ({
  subject: `Request rejected: ${startIso} – ${endIso}`,
  html: `<p>${rejecterName} rejected ${requesterName}'s request for ${startIso} – ${endIso}.</p>`,
})

export const bookingCancelledEmail = (
  ownerName: string,
  startIso: string,
  endIso: string,
): { subject: string, html: string } => ({
  subject: `Booking cancelled: ${ownerName}, ${startIso} – ${endIso}`,
  html: `<p>${ownerName} cancelled their booking from ${startIso} to ${endIso}. Those days are now free.</p>`,
})

export const maintenanceCreatedEmail = (
  ownerName: string,
  startIso: string,
  endIso: string,
  reason: string,
): { subject: string, html: string } => ({
  subject: `Boat marked unavailable: ${startIso} – ${endIso}`,
  html: `<p>${ownerName} marked the boat unavailable from ${startIso} to ${endIso}.</p><p><em>Reason: ${reason}</em></p>`,
})
