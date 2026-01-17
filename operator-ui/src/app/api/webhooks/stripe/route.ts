import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { eventsRepo } from '@/lib/repositories/events'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      )
    }

    // Handle checkout.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session

      // Get amount from payment intent or session
      let amount = 0
      let currency = 'usd'
      
      if (session.amount_total) {
        amount = session.amount_total
        currency = session.currency || 'usd'
      } else if (session.payment_intent) {
        try {
          const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent as string)
          amount = paymentIntent.amount
          currency = paymentIntent.currency
        } catch (e) {
          console.warn('Could not retrieve payment intent:', e)
        }
      }

      // Log checkout_completed event with revenue amount
      try {
        await eventsRepo.create({
          org_id: INTAKE_ORG_ID,
          actor_user_id: null,
          actor_role: 'public',
          event_type: 'checkout_completed',
          target_type: 'checkout_session',
          target_id: session.id,
          metadata: {
            session_id: session.id,
            customer_email: session.customer_email || session.customer_details?.email || null,
            amount: amount,
            currency: currency,
            amount_dollars: amount / 100, // Convert cents to dollars
            mode: session.mode,
            tier: session.metadata?.tier || null,
            intent: session.metadata?.intent || null,
            source: session.metadata?.source || 'pricing_page',
            payment_status: session.payment_status,
          },
        })
      } catch (e) {
        console.error('Failed to log checkout_completed event (non-fatal):', e)
      }

      // If customer email exists and paid status is paid, mark related intake as qualified
      if (session.customer_email && session.payment_status === 'paid') {
        try {
          await db.intake.updateMany({
            where: {
              email: session.customer_email.toLowerCase(),
              status: { in: ['new', 'contacted'] },
            },
            data: {
              status: 'qualified',
            },
          })
        } catch (e) {
          console.error('Failed to update intake status (non-fatal):', e)
        }
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Stripe webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

