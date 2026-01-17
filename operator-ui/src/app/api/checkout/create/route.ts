import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { db } from '@/lib/db'
import { eventsRepo } from '@/lib/repositories/events'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ironfrontdigital.com'
const INTAKE_ORG_ID = process.env.INTAKE_ORG_ID || '00000000-0000-0000-0000-000000000002'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, email, tier, intent } = body

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      )
    }

    // Determine mode based on price (subscription vs one-time)
    // We'll check the price to determine mode
    let mode: 'subscription' | 'payment' = 'subscription'
    try {
      const price = await stripe.prices.retrieve(priceId)
      if (!price.recurring) {
        mode = 'payment'
      }
    } catch (e) {
      // If we can't retrieve price, default to subscription
      console.warn('Could not retrieve price, defaulting to subscription mode')
    }

    // Get price details for amount tracking
    let amount = null
    let currency = 'usd'
    try {
      const price = await stripe.prices.retrieve(priceId)
      amount = price.unit_amount
      currency = price.currency
    } catch (e) {
      console.warn('Could not retrieve price for amount tracking:', e)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: email || undefined,
      success_url: `${APP_URL}/apply/success?session_id={CHECKOUT_SESSION_ID}${tier ? `&tier=${tier}` : ''}${intent ? `&intent=${intent}` : ''}`,
      cancel_url: `${APP_URL}/pricing`,
      metadata: {
        source: 'pricing_page',
        tier: tier || '',
        intent: intent || 'launch',
      },
    })

    // Log checkout_started event
    try {
      await eventsRepo.create({
        org_id: INTAKE_ORG_ID,
        actor_user_id: null,
        actor_role: 'public',
        event_type: 'checkout_started',
        target_type: 'checkout_session',
        target_id: session.id,
        metadata: {
          session_id: session.id,
          price_id: priceId,
          tier: tier || null,
          intent: intent || null,
          email: email || null,
          amount: amount,
          currency: currency,
          mode: mode,
        },
      })
    } catch (e) {
      console.error('Failed to log checkout_started event (non-fatal):', e)
    }

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

