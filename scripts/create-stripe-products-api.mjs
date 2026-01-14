#!/usr/bin/env node
/**
 * Create Stripe Products via API (ES Module version)
 * Requires: STRIPE_SECRET_KEY in environment or .env file
 * 
 * Usage:
 *   node scripts/create-stripe-products-api.mjs
 */

import Stripe from 'stripe';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env if exists
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const value = match[2].trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  });
}

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
  console.error('❌ ERROR: STRIPE_SECRET_KEY not found');
  console.error('');
  console.error('Set it in .env or environment:');
  console.error('  STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products-api.mjs');
  process.exit(1);
}

if (!STRIPE_SECRET_KEY.startsWith('sk_test_') && !STRIPE_SECRET_KEY.startsWith('sk_live_')) {
  console.error('⚠️  WARNING: STRIPE_SECRET_KEY format looks invalid');
  console.error('   Should start with sk_test_ or sk_live_');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

const products = [
  {
    name: 'Individual Operator',
    description: 'Platform access for individual operators',
    amount: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month'
  },
  {
    name: 'Builder',
    description: 'Builder tier platform access',
    amount: 29900, // $299.00 in cents
    currency: 'usd',
    interval: 'month'
  },
  {
    name: 'Advanced Operator',
    description: 'Advanced operator platform access',
    amount: 59900, // $599.00 in cents
    currency: 'usd',
    interval: 'month'
  },
  {
    name: 'Organization / Leader',
    description: 'Organization and leader tier platform access',
    amount: 99900, // $999.00 in cents
    currency: 'usd',
    interval: 'month'
  },
  {
    name: 'Franchise License',
    description: '3-year franchise license (one-time payment)',
    amount: 1000000, // $10,000.00 in cents
    currency: 'usd',
    interval: null // One-time
  }
];

async function createProducts() {
  console.log('==========================================');
  console.log('  Creating Stripe Products via API');
  console.log('==========================================');
  console.log('');
  console.log(`Using API key: ${STRIPE_SECRET_KEY.substring(0, 15)}...`);
  console.log('');

  const priceIds = {};

  for (const product of products) {
    try {
      console.log(`Creating: ${product.name}`);

      // Create product
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.description,
      });

      // Create price
      const priceData = {
        product: stripeProduct.id,
        unit_amount: product.amount,
        currency: product.currency,
      };

      if (product.interval) {
        priceData.recurring = {
          interval: product.interval,
        };
      }

      const price = await stripe.prices.create(priceData);

      // Map to standard keys
      let key;
      if (product.name === 'Individual Operator') key = 'INDIVIDUAL';
      else if (product.name === 'Builder') key = 'BUILDER';
      else if (product.name === 'Advanced Operator') key = 'ADVANCED';
      else if (product.name === 'Organization / Leader') key = 'ORGANIZATION';
      else if (product.name === 'Franchise License') key = 'FRANCHISE';

      priceIds[key] = price.id;

      console.log(`  ✅ Created: ${product.name}`);
      console.log(`     Price ID: ${price.id}`);
      console.log('');
    } catch (error) {
      console.error(`  ❌ Failed to create ${product.name}:`, error.message);
      if (error.code === 'resource_already_exists') {
        console.error(`     Product may already exist. Check Stripe Dashboard.`);
      }
      console.error('');
    }
  }

  console.log('==========================================');
  console.log('  Products Created!');
  console.log('==========================================');
  console.log('');
  console.log('Price IDs:');
  console.log(`  STRIPE_PRICE_INDIVIDUAL=${priceIds.INDIVIDUAL || 'NOT_CREATED'}`);
  console.log(`  STRIPE_PRICE_BUILDER=${priceIds.BUILDER || 'NOT_CREATED'}`);
  console.log(`  STRIPE_PRICE_ADVANCED=${priceIds.ADVANCED || 'NOT_CREATED'}`);
  console.log(`  STRIPE_PRICE_ORGANIZATION=${priceIds.ORGANIZATION || 'NOT_CREATED'}`);
  console.log(`  STRIPE_PRICE_FRANCHISE=${priceIds.FRANCHISE || 'NOT_CREATED'}`);
  console.log('');

  // Output for setup script
  if (priceIds.INDIVIDUAL && priceIds.BUILDER && priceIds.ADVANCED && 
      priceIds.ORGANIZATION && priceIds.FRANCHISE) {
    console.log('✅ All products created successfully!');
    console.log('');
    console.log('Run this to update .env:');
    console.log(`./scripts/setup-stripe-quick.sh /opt/ifd-app/.env \\`);
    console.log(`  ${priceIds.INDIVIDUAL} \\`);
    console.log(`  ${priceIds.BUILDER} \\`);
    console.log(`  ${priceIds.ADVANCED} \\`);
    console.log(`  ${priceIds.ORGANIZATION} \\`);
    console.log(`  ${priceIds.FRANCHISE}`);
    console.log('');
    
    // Also output in format that setup-stripe-complete.sh can parse
    console.log('STRIPE_PRICE_INDIVIDUAL=' + priceIds.INDIVIDUAL);
    console.log('STRIPE_PRICE_BUILDER=' + priceIds.BUILDER);
    console.log('STRIPE_PRICE_ADVANCED=' + priceIds.ADVANCED);
    console.log('STRIPE_PRICE_ORGANIZATION=' + priceIds.ORGANIZATION);
    console.log('STRIPE_PRICE_FRANCHISE=' + priceIds.FRANCHISE);
  } else {
    console.log('⚠️  Some products failed to create. Check errors above.');
  }
}

createProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

