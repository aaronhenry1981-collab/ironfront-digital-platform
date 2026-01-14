#!/usr/bin/env node
/**
 * Create Stripe Products via API with Tax Configuration
 * Includes customer-facing descriptions and Stripe Tax setup
 * 
 * Usage:
 *   node scripts/create-stripe-products-with-tax.mjs
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
  console.error('  STRIPE_SECRET_KEY=sk_test_... node scripts/create-stripe-products-with-tax.mjs');
  process.exit(1);
}

if (!STRIPE_SECRET_KEY.startsWith('sk_test_') && !STRIPE_SECRET_KEY.startsWith('sk_live_')) {
  console.error('⚠️  WARNING: STRIPE_SECRET_KEY format looks invalid');
  console.error('   Should start with sk_test_ or sk_live_');
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Products will be updated based on ChatGPT conversation
// For now, using placeholder structure
const products = [
  {
    name: 'Individual Operator',
    description: 'Platform access for individual operators', // Will be updated
    customerDescription: 'Full platform access for individual operators with core features', // Customer-facing
    amount: 9900, // $99.00 in cents
    currency: 'usd',
    interval: 'month',
    taxCode: 'txcd_10000000', // Digital products tax code (will be updated if needed)
    metadata: {
      tier: 'individual',
      features: 'core_platform_access'
    }
  },
  {
    name: 'Builder',
    description: 'Builder tier platform access', // Will be updated
    customerDescription: 'Enhanced platform access for building and scaling operations', // Customer-facing
    amount: 29900, // $299.00 in cents
    currency: 'usd',
    interval: 'month',
    taxCode: 'txcd_10000000',
    metadata: {
      tier: 'builder',
      features: 'enhanced_access'
    }
  },
  {
    name: 'Advanced Operator',
    description: 'Advanced operator platform access', // Will be updated
    customerDescription: 'Advanced platform features for experienced operators', // Customer-facing
    amount: 59900, // $599.00 in cents
    currency: 'usd',
    interval: 'month',
    taxCode: 'txcd_10000000',
    metadata: {
      tier: 'advanced',
      features: 'advanced_features'
    }
  },
  {
    name: 'Organization / Leader',
    description: 'Organization and leader tier platform access', // Will be updated
    customerDescription: 'Enterprise-level platform access for organizations and leaders', // Customer-facing
    amount: 99900, // $999.00 in cents
    currency: 'usd',
    interval: 'month',
    taxCode: 'txcd_10000000',
    metadata: {
      tier: 'organization',
      features: 'enterprise_features'
    }
  },
  {
    name: 'Franchise License',
    description: '3-year franchise license (one-time payment)', // Will be updated
    customerDescription: '3-year franchise license with full platform access and support', // Customer-facing
    amount: 1000000, // $10,000.00 in cents
    currency: 'usd',
    interval: null, // One-time
    taxCode: 'txcd_10000000',
    metadata: {
      tier: 'franchise',
      license_type: '3_year',
      features: 'franchise_license'
    }
  }
];

async function createProducts() {
  console.log('==========================================');
  console.log('  Creating Stripe Products with Tax');
  console.log('==========================================');
  console.log('');
  console.log(`Using API key: ${STRIPE_SECRET_KEY.substring(0, 15)}...`);
  console.log('');

  const priceIds = {};

  for (const product of products) {
    try {
      console.log(`Creating: ${product.name}`);

      // Create product with customer-facing description
      const stripeProduct = await stripe.products.create({
        name: product.name,
        description: product.customerDescription || product.description,
        metadata: product.metadata,
        // Enable tax if Stripe Tax is configured
        tax_code: product.taxCode,
      });

      // Create price
      const priceData = {
        product: stripeProduct.id,
        unit_amount: product.amount,
        currency: product.currency,
        // Enable automatic tax calculation
        tax_behavior: 'exclusive', // Tax calculated separately (or 'inclusive' if tax included)
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
      console.log(`     Product ID: ${stripeProduct.id}`);
      console.log(`     Price ID: ${price.id}`);
      console.log(`     Description: ${product.customerDescription}`);
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
  console.log('⚠️  Note: Stripe Tax is configured with tax_behavior: exclusive');
  console.log('   Tax will be calculated automatically based on customer location');
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

