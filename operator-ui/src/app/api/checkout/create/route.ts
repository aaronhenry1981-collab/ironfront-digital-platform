import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ironfrontdigital.com'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { priceId, email } = body

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
      success_url: `${APP_URL}/apply?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/pricing`,
      metadata: {
        source: 'pricing_page',
      },
    })

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

