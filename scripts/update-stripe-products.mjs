#!/usr/bin/env node
/**
 * Update Existing Stripe Products with Correct Definitions
 * Based on actual product definitions from scale/launch pages
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
  process.exit(1);
}

const stripe = new Stripe(STRIPE_SECRET_KEY);

// Products based on actual pages
// Scale path products
const SCALE_PRODUCTS = [
  {
    name: 'Individual Operator',
    description: 'Platform access for individual operators. Includes operational dashboards, team visibility, automated onboarding, lead handling & routing, and intervention insights.',
    customerDescription: 'Essential platform access for individual operators. Includes operational dashboards, team visibility, automated onboarding, lead handling & routing, and intervention insights. Perfect for getting started with Iron Front infrastructure.',
    amount: 4900, // $49.00 in cents (from scale page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'individual',
      path: 'scale',
      features: 'core_platform_access'
    }
  },
  {
    name: 'Builder',
    description: 'Enhanced platform access for building and scaling operations. Includes all Individual Operator features plus advanced automation and scaling tools.',
    customerDescription: 'Enhanced platform access for building and scaling operations. Includes all Individual Operator features plus advanced automation, scaling tools, and expanded team management capabilities.',
    amount: 19900, // $199.00 in cents (from scale page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'builder',
      path: 'scale',
      features: 'enhanced_access'
    }
  },
  {
    name: 'Org Leader',
    description: 'Enterprise-level platform access for organization leaders. Includes all Builder features plus advanced analytics, priority support, and organization-wide management tools.',
    customerDescription: 'Enterprise-level platform access for organization leaders. Includes all Builder features plus advanced analytics, priority support, organization-wide management tools, and dedicated resources.',
    amount: 59900, // $599.00 in cents (from scale page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'leader',
      path: 'scale',
      features: 'enterprise_features'
    }
  },
];

// Launch path products
const LAUNCH_PRODUCTS = [
  {
    name: 'Starter',
    description: 'LaunchPath™ Starter tier. Step-by-step business setup, systems for leads and follow-up, training on structure, and optional access to operating environments.',
    customerDescription: 'LaunchPath™ Starter tier. Perfect for starting from zero. Includes step-by-step business setup, systems for leads and follow-up, training on structure, and optional access to operating environments (EEP).',
    amount: 9900, // $99.00 in cents (from launch page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'starter',
      path: 'launch',
      features: 'launchpath_starter'
    }
  },
  {
    name: 'Growth',
    description: 'LaunchPath™ Growth tier. Enhanced business setup with advanced systems, expanded training, and priority access to operating environments.',
    customerDescription: 'LaunchPath™ Growth tier. Enhanced business setup with advanced systems, expanded training, priority access to operating environments, and scaling support.',
    amount: 29900, // $299.00 in cents (from launch page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'growth',
      path: 'launch',
      features: 'launchpath_growth'
    }
  },
  {
    name: 'Scale',
    description: 'LaunchPath™ Scale tier. Complete business operating system with full infrastructure, advanced training, and comprehensive support.',
    customerDescription: 'LaunchPath™ Scale tier. Complete business operating system with full infrastructure, advanced training, comprehensive support, and enterprise-level features.',
    amount: 99900, // $999.00 in cents (from launch page)
    currency: 'usd',
    interval: 'month',
    metadata: {
      tier: 'scale',
      path: 'launch',
      features: 'launchpath_scale'
    }
  },
];

// Franchise License (shared)
const FRANCHISE_PRODUCT = {
  name: 'Franchise License',
  description: '3-year franchise license with full platform access and support. Includes all platform features, dedicated resources, and franchise-level support.',
  customerDescription: '3-year franchise license with full platform access and support. Includes all platform features, dedicated resources, franchise-level support, and comprehensive business infrastructure.',
  amount: 1000000, // $10,000.00 in cents
  currency: 'usd',
  interval: null, // One-time
  metadata: {
    tier: 'franchise',
    path: 'both',
    license_type: '3_year',
    features: 'franchise_license'
  }
};

// All products combined
const ALL_PRODUCTS = [...SCALE_PRODUCTS, ...LAUNCH_PRODUCTS, FRANCHISE_PRODUCT];

async function createOrUpdateProducts() {
  console.log('==========================================');
  console.log('  Creating/Updating Stripe Products');
  console.log('==========================================');
  console.log('');
  console.log(`Using API key: ${STRIPE_SECRET_KEY.substring(0, 15)}...`);
  console.log('');

  const priceIds = {};

  for (const product of ALL_PRODUCTS) {
    try {
      console.log(`Processing: ${product.name}`);

      // Check if product already exists
      const existingProducts = await stripe.products.search({
        query: `name:'${product.name}'`,
        limit: 1,
      });

      let stripeProduct;
      if (existingProducts.data.length > 0) {
        // Update existing product
        stripeProduct = await stripe.products.update(existingProducts.data[0].id, {
          name: product.name,
          description: product.customerDescription || product.description,
          metadata: product.metadata,
          active: true,
        });
        console.log(`  ✅ Updated existing product: ${stripeProduct.id}`);
      } else {
        // Create new product
        // Note: tax_code is optional - only set if Stripe Tax is enabled
        // Common SaaS tax codes: txcd_10100000 (Software), but may vary by region
        const productData = {
          name: product.name,
          description: product.customerDescription || product.description,
          metadata: product.metadata,
        };
        // Only add tax_code if Stripe Tax is configured (can be set later in dashboard)
        stripeProduct = await stripe.products.create(productData);
        console.log(`  ✅ Created new product: ${stripeProduct.id}`);
      }

      // Check if price already exists for this product
      const existingPrices = await stripe.prices.list({
        product: stripeProduct.id,
        limit: 10,
      });

      // Find matching price
      let matchingPrice = existingPrices.data.find(p => {
        if (product.interval) {
          return p.recurring && 
                 p.recurring.interval === product.interval &&
                 p.unit_amount === product.amount &&
                 p.currency === product.currency;
        } else {
          return !p.recurring &&
                 p.unit_amount === product.amount &&
                 p.currency === product.currency;
        }
      });

      let price;
      if (matchingPrice) {
        price = matchingPrice;
        console.log(`  ✅ Using existing price: ${price.id}`);
      } else {
        // Create new price
        const priceData = {
          product: stripeProduct.id,
          unit_amount: product.amount,
          currency: product.currency,
          tax_behavior: 'exclusive', // Tax calculated separately
        };

        if (product.interval) {
          priceData.recurring = {
            interval: product.interval,
          };
        }

        price = await stripe.prices.create(priceData);
        console.log(`  ✅ Created new price: ${price.id}`);
      }

      // Map to standard keys for .env
      let key;
      if (product.name === 'Individual Operator') key = 'INDIVIDUAL';
      else if (product.name === 'Builder') key = 'BUILDER';
      else if (product.name === 'Org Leader') key = 'ORGANIZATION';
      else if (product.name === 'Starter') key = 'STARTER';
      else if (product.name === 'Growth') key = 'GROWTH';
      else if (product.name === 'Scale') key = 'SCALE';
      else if (product.name === 'Franchise License') key = 'FRANCHISE';

      if (key) {
        priceIds[key] = price.id;
      }

      console.log('');
    } catch (error) {
      console.error(`  ❌ Failed to process ${product.name}:`, error.message);
      console.error('');
    }
  }

  console.log('==========================================');
  console.log('  Products Created/Updated!');
  console.log('==========================================');
  console.log('');
  console.log('Price IDs for .env:');
  console.log('');
  
  if (priceIds.INDIVIDUAL) console.log(`STRIPE_PRICE_INDIVIDUAL=${priceIds.INDIVIDUAL}`);
  if (priceIds.BUILDER) console.log(`STRIPE_PRICE_BUILDER=${priceIds.BUILDER}`);
  if (priceIds.ORGANIZATION) console.log(`STRIPE_PRICE_ORGANIZATION=${priceIds.ORGANIZATION}`);
  if (priceIds.STARTER) console.log(`STRIPE_PRICE_STARTER=${priceIds.STARTER}`);
  if (priceIds.GROWTH) console.log(`STRIPE_PRICE_GROWTH=${priceIds.GROWTH}`);
  if (priceIds.SCALE) console.log(`STRIPE_PRICE_SCALE=${priceIds.SCALE}`);
  if (priceIds.FRANCHISE) console.log(`STRIPE_PRICE_FRANCHISE=${priceIds.FRANCHISE}`);
  
  console.log('');
  console.log('Note: You may need to map these to your existing env variables');
  console.log('based on your product naming convention.');
}

createOrUpdateProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

