/**
 * Email sending utility
 * For v1, logs to console. In production, wire to actual email service.
 */

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export async function sendMagicLink(email: string, token: string): Promise<void> {
  const verifyUrl = `${APP_URL}/api/auth/verify-link?token=${token}`

  // TODO: Wire to actual email service (SendGrid, AWS SES, etc.)
  // For now, log to console
  console.log('='.repeat(80))
  console.log('MAGIC LINK EMAIL (v1 - console only)')
  console.log('='.repeat(80))
  console.log(`To: ${email}`)
  console.log(`Subject: Your Iron Front Digital Login Link`)
  console.log('')
  console.log(`Click this link to log in:`)
  console.log(verifyUrl)
  console.log('')
  console.log('This link expires in 15 minutes.')
  console.log('='.repeat(80))

  // In production, uncomment and configure:
  // await sendEmail({
  //   to: email,
  //   subject: 'Your Iron Front Digital Login Link',
  //   html: `
  //     <p>Click the link below to log in:</p>
  //     <p><a href="${verifyUrl}">${verifyUrl}</a></p>
  //     <p>This link expires in 15 minutes.</p>
  //   `,
  // })
}





