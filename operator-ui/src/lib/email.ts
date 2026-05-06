/**
 * Email service — sends transactional + outreach email via AWS SES.
 *
 * Uses the standard AWS SDK credential chain, so on EC2/ECS the
 * instance/task role is picked up automatically; locally falls back to
 * AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
 *
 * Required env:
 *   AWS_REGION                  — e.g. us-east-1
 *   AWS_SES_FROM_EMAIL          — e.g. "Iron Front Digital <hello@ironfrontdigital.com>"
 *
 * Optional env:
 *   AWS_SES_REPLY_TO_DOMAIN     — e.g. "operations.ironfrontdigital.com" — when set,
 *                                 outreach emails get a reply-to of
 *                                 intake-<intakeId>@<domain> so inbound replies
 *                                 thread back to the right intake.
 *
 * If neither AWS credentials nor AWS_SES_FROM_EMAIL is configured, falls back
 * to console logging — useful for local dev. Detect this via isEmailConfigured().
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

let sesClient: SESClient | null = null

function getClient(): SESClient | null {
  const region = process.env.AWS_REGION
  const from = process.env.AWS_SES_FROM_EMAIL
  if (!region || !from) return null
  if (!sesClient) {
    sesClient = new SESClient({ region })
  }
  return sesClient
}

export function isEmailConfigured(): boolean {
  return !!(process.env.AWS_REGION && process.env.AWS_SES_FROM_EMAIL)
}

const APP_URL =
  process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface SendEmailInput {
  to: string
  subject: string
  text?: string
  html?: string
  replyTo?: string
}

export interface SendEmailResult {
  ok: boolean
  message_id?: string
  error?: string
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const from = process.env.AWS_SES_FROM_EMAIL
  const client = getClient()

  // Dev fallback when SES isn't configured.
  if (!client || !from) {
    console.log('='.repeat(80))
    console.log('EMAIL (no provider configured — logging to console)')
    console.log('='.repeat(80))
    console.log(`To:       ${input.to}`)
    console.log(`From:     ${from || '(unset)'}`)
    console.log(`Subject:  ${input.subject}`)
    if (input.replyTo) console.log(`Reply-To: ${input.replyTo}`)
    console.log('')
    console.log(input.text || stripHtml(input.html || ''))
    console.log('='.repeat(80))
    return { ok: true, message_id: 'console:dev' }
  }

  if (!input.text && !input.html) {
    return { ok: false, error: 'Either text or html is required' }
  }

  try {
    const command = new SendEmailCommand({
      Source: from,
      Destination: { ToAddresses: [input.to] },
      ReplyToAddresses: input.replyTo ? [input.replyTo] : undefined,
      Message: {
        Subject: { Data: input.subject, Charset: 'UTF-8' },
        Body: {
          ...(input.text
            ? { Text: { Data: input.text, Charset: 'UTF-8' } }
            : {}),
          ...(input.html
            ? { Html: { Data: input.html, Charset: 'UTF-8' } }
            : {}),
        },
      },
    })
    const response = await client.send(command)
    return { ok: true, message_id: response.MessageId }
  } catch (error: any) {
    console.error('SES send failed:', error?.message || error)
    return { ok: false, error: error?.message || 'SES send failed' }
  }
}

/**
 * Build a reply-to address that lets inbound replies thread back to the
 * intake. Returns null if the domain isn't configured (in which case
 * inbound capture is disabled).
 */
export function buildReplyToForIntake(intakeId: string): string | null {
  const domain = process.env.AWS_SES_REPLY_TO_DOMAIN
  if (!domain) return null
  return `intake-${intakeId}@${domain}`
}

/**
 * Send the magic-link email used by /api/auth/request-link.
 */
export async function sendMagicLink(email: string, token: string): Promise<SendEmailResult> {
  const verifyUrl = `${APP_URL}/api/auth/verify-link?token=${token}`
  const subject = 'Your Iron Front Digital Login Link'
  const text = [
    'Your secure login link for Iron Front Digital:',
    '',
    verifyUrl,
    '',
    'This link expires in 15 minutes and can only be used once.',
    '',
    'If you did not request this, you can safely ignore this email.',
  ].join('\n')
  const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,sans-serif;line-height:1.6;color:#0b0b0d;background:#f9f9f9;padding:24px">
  <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;padding:32px;border:1px solid #e5e7eb">
    <tr><td>
      <h2 style="margin:0 0 16px;font-size:20px;font-weight:600">Your Iron Front Digital login link</h2>
      <p style="margin:0 0 24px;color:#374151">Click below to sign in. This link expires in 15 minutes and can only be used once.</p>
      <p style="margin:0 0 24px"><a href="${verifyUrl}" style="display:inline-block;background:#0b0b0d;color:#ffffff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:500">Sign in</a></p>
      <p style="margin:0;color:#6b7280;font-size:13px">If you did not request this email, you can safely ignore it.</p>
    </td></tr>
  </table>
</body></html>`.trim()
  return sendEmail({ to: email, subject, text, html })
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}
