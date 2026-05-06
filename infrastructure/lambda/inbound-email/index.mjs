/**
 * AWS Lambda — SES inbound email forwarder.
 *
 * Triggered by an SES Receipt Rule that writes the raw email to S3 and
 * publishes an SNS notification (or invokes this Lambda directly). Reads
 * the raw email from S3, extracts to/from/subject/text, POSTs it to the
 * operator-ui's /api/inbound/email endpoint with the shared secret.
 *
 * Environment variables (required):
 *   APP_BASE_URL              - e.g. https://ironfrontdigital.com
 *   INBOUND_EMAIL_SECRET      - must match the operator-ui env var
 *
 * Environment variables (optional):
 *   S3_BUCKET                 - explicit bucket override; otherwise read
 *                                from the SES event
 *   POST_TIMEOUT_MS           - default 10000
 *
 * IAM permissions needed:
 *   s3:GetObject on the inbound bucket prefix
 *   logs:CreateLogGroup, logs:CreateLogStream, logs:PutLogEvents
 */

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { simpleParser } from 'mailparser'

const s3 = new S3Client({})

const APP_BASE_URL = process.env.APP_BASE_URL
const INBOUND_EMAIL_SECRET = process.env.INBOUND_EMAIL_SECRET
const POST_TIMEOUT_MS = Number(process.env.POST_TIMEOUT_MS || 10_000)

if (!APP_BASE_URL || !INBOUND_EMAIL_SECRET) {
  console.warn(
    '[inbound-email] APP_BASE_URL or INBOUND_EMAIL_SECRET not set; ' +
      'Lambda will fail at invocation time.'
  )
}

export const handler = async (event) => {
  const records = extractSesRecords(event)
  if (records.length === 0) {
    console.warn('[inbound-email] No SES records in event:', JSON.stringify(event).slice(0, 500))
    return { statusCode: 204 }
  }

  const results = []
  for (const record of records) {
    try {
      const result = await processRecord(record)
      results.push(result)
    } catch (err) {
      console.error('[inbound-email] processRecord failed:', err)
      results.push({ ok: false, error: err?.message || String(err) })
    }
  }

  // Don't throw; SES will keep retrying and we just want best-effort.
  return { statusCode: 200, body: JSON.stringify(results) }
}

function extractSesRecords(event) {
  // Two shapes are possible:
  //   1. Direct SES action: event.Records = [{ ses: {mail, receipt} }, ...]
  //   2. SNS-wrapped:       event.Records = [{ EventSource: 'aws:sns', Sns: {Message: '<json>'} }, ...]
  //                         where Message contains a 'mail' + 'receipt'.
  const out = []
  for (const r of event?.Records ?? []) {
    if (r?.eventSource === 'aws:ses' && r?.ses) {
      out.push(r.ses)
    } else if (r?.EventSource === 'aws:sns' && r?.Sns?.Message) {
      try {
        const parsed = JSON.parse(r.Sns.Message)
        if (parsed?.mail) out.push(parsed)
      } catch (e) {
        console.warn('[inbound-email] Could not JSON-parse SNS message')
      }
    }
  }
  return out
}

async function processRecord(record) {
  const messageId = record?.mail?.messageId
  const recipients = record?.receipt?.recipients || record?.mail?.destination || []
  if (!messageId) {
    return { ok: false, error: 'no_message_id' }
  }

  const bucket = process.env.S3_BUCKET || record?.receipt?.action?.bucketName
  if (!bucket) {
    return { ok: false, error: 'no_s3_bucket' }
  }

  // The S3 object key the SES "S3 action" wrote. SES uses the messageId
  // as the key by default, optionally prefixed.
  const keyPrefix = record?.receipt?.action?.objectKeyPrefix || ''
  const key = keyPrefix ? `${keyPrefix}${messageId}` : messageId

  // Fetch the raw RFC 822 message.
  const { Body } = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }))
  const raw = await streamToBuffer(Body)

  // Parse to extract a clean text body and headers.
  const parsed = await simpleParser(raw)

  const fromAddr =
    parsed.from?.value?.[0]?.address ||
    record?.mail?.commonHeaders?.from?.[0] ||
    'unknown'

  const subject = parsed.subject || record?.mail?.commonHeaders?.subject || null

  // Prefer plain-text body; fall back to text-from-html; last-resort the raw text.
  const text = (parsed.text || parsed.html || raw.toString('utf8')).trim()

  // Forward one POST per matching recipient (an inbound email may CC
  // multiple intake-<id>@ addresses, which is rare but worth handling).
  const targets = recipients.length > 0 ? recipients : ['unknown@unknown']
  const posts = await Promise.all(
    targets.map((to) =>
      postToApp({
        to,
        from: fromAddr,
        subject,
        text,
        message_id: messageId,
      })
    )
  )

  return { ok: true, message_id: messageId, posts }
}

async function postToApp(payload) {
  const url = `${APP_BASE_URL}/api/inbound/email`
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), POST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-inbound-secret': INBOUND_EMAIL_SECRET,
      },
      body: JSON.stringify(payload),
      signal: ctrl.signal,
    })
    const body = await res.text()
    if (!res.ok) {
      console.error(`[inbound-email] POST ${res.status}: ${body.slice(0, 500)}`)
      return { status: res.status, ok: false }
    }
    return { status: res.status, ok: true }
  } finally {
    clearTimeout(t)
  }
}

function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (c) => chunks.push(typeof c === 'string' ? Buffer.from(c) : c))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}
