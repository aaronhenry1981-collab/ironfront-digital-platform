#!/usr/bin/env node
/**
 * Update Stripe Products with Monthly AND Annual Pricing
 * Creates both monthly and annual (with discount) prices
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

// Products with monthly and annual pricing
// Annual pricing is typically 10-20% discount (2 months free = ~16.67% discount)
const PRODUCTS = [
  // Scale path
  {
    name: 'Individual Operator',
    description: 'Essential platform access for individual operators. Includes operational dashboards, team visibility, automated onboarding, lead handling & routing, and intervention insights. Perfect for getting started with Iron Front infrastructure.',
    monthlyAmount: 4900, // $49.00
    annualAmount: 49000, // $490.00 (10 months = ~16.67% discount)
    metadata: { tier: 'individual', path: 'scale' }
  },
  {
    name: 'Builder',
    description: 'Enhanced platform access for building and scaling operations. Includes all Individual Operator features plus advanced automation, scaling tools, and expanded team management capabilities.',
    monthlyAmount: 19900, // $199.00
    annualAmount: 199000, // $1,990.00 (10 months = ~16.67% discount)
    metadata: { tier: 'builder', path: 'scale' }
  },
  {
    name: 'Org Leader',
    description: 'Enterprise-level platform access for organization leaders. Includes all Builder features plus advanced analytics, priority support, organization-wide management tools, and dedicated resources.',
    monthlyAmount: 59900, // $599.00
    annualAmount: 599000, // $5,990.00 (10 months = ~16.67% discount)
    metadata: { tier: 'leader', path: 'scale' }
  },
  // Launch path
  {
    name: 'Starter',
    description: 'LaunchPath™ Starter tier. Perfect for starting from zero. Includes step-by-step business setup, systems for leads and follow-up, training on structure, and optional access to operating environments (EEP).',
    monthlyAmount: 9900, // $99.00
    annualAmount: 99000, // $990.00 (10 months = ~16.67% discount)
    metadata: { tier: 'starter', path: 'launch' }
  },
  {
    name: 'Growth',
    description: 'LaunchPath™ Growth tier. Enhanced business setup with advanced systems, expanded training, priority access to operating environments, and scaling support.',
    monthlyAmount: 29900, // $299.00
    annualAmount: 299000, // $2,990.00 (10 months = ~16.67% discount)
    metadata: { tier: 'growth', path: 'launch' }
  },
  {
    name: 'Scale',
    description: 'LaunchPath™ Scale tier. Complete business operating system with full infrastructure, advanced training, comprehensive support, and enterprise-level features.',
    monthlyAmount: 99900, // $999.00
    annualAmount: 999000, // $9,990.00 (10 months = ~16.67% discount)
    metadata: { tier: 'scale', path: 'launch' }
  },
  // Franchise (one-time only, no annual)
  {
    name: 'Franchise License',
    description: '3-year franchise license with full platform access and support. Includes all platform features, dedicated resources, franchise-level support, and comprehensive business infrastructure.',
    monthlyAmount: null, // One-time only
    annualAmount: 1000000, // $10,000.00 (one-time, 3-year license)
    metadata: { tier: 'franchise', path: 'both', license_type: '3_year' }
  },
];

async function createOrUpdateProducts() {
  console.log('==========================================');
  console.log('  Creating/Updating Stripe Products');
  console.log('  With Monthly AND Annual Pricing');
  console.log('==========================================');
  console.log('');
  console.log(`Using API key: ${STRIPE_SECRET_KEY.substring(0, 15)}...`);
  console.log('');

  const priceIds = {};

  for (const product of PRODUCTS) {
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
          description: product.description,
          metadata: product.metadata,
          active: true,
        });
        console.log(`  ✅ Updated existing product: ${stripeProduct.id}`);
      } else {
        // Create new product
        stripeProduct = await stripe.products.create({
          name: product.name,
          description: product.description,
          metadata: product.metadata,
        });
        console.log(`  ✅ Created new product: ${stripeProduct.id}`);
      }

      // Create/update monthly price (if applicable)
      if (product.monthlyAmount) {
        const existingPrices = await stripe.prices.list({
          product: stripeProduct.id,
          limit: 20,
        });

        // Find matching monthly price
        let monthlyPrice = existingPrices.data.find(p => 
          p.recurring && 
          p.recurring.interval === 'month' &&
          p.unit_amount === product.monthlyAmount &&
          p.currency === 'usd'
        );

        if (!monthlyPrice) {
          monthlyPrice = await stripe.prices.create({
            product: stripeProduct.id,
            unit_amount: product.monthlyAmount,
            currency: 'usd',
            recurring: { interval: 'month' },
            tax_behavior: 'exclusive',
          });
          console.log(`  ✅ Created monthly price: ${monthlyPrice.id} ($${(product.monthlyAmount / 100).toFixed(2)}/mo)`);
        } else {
          console.log(`  ✅ Using existing monthly price: ${monthlyPrice.id} ($${(product.monthlyAmount / 100).toFixed(2)}/mo)`);
        }

        // Map to env key
        let key;
        if (product.name === 'Individual Operator') key = 'INDIVIDUAL';
        else if (product.name === 'Builder') key = 'BUILDER';
        else if (product.name === 'Org Leader') key = 'ORGANIZATION';
        else if (product.name === 'Starter') key = 'STARTER';
        else if (product.name === 'Growth') key = 'GROWTH';
        else if (product.name === 'Scale') key = 'SCALE';

        if (key) {
          priceIds[`${key}_MONTHLY`] = monthlyPrice.id;
        }
      }

      // Create/update annual price
      const existingPrices = await stripe.prices.list({
        product: stripeProduct.id,
        limit: 20,
      });

      // Find matching annual price
      let annualPrice = existingPrices.data.find(p => {
        if (product.monthlyAmount) {
          // Recurring annual
          return p.recurring && 
                 p.recurring.interval === 'year' &&
                 p.unit_amount === product.annualAmount &&
                 p.currency === 'usd';
        } else {
          // One-time (franchise)
          return !p.recurring &&
                 p.unit_amount === product.annualAmount &&
                 p.currency === 'usd';
        }
      });

      if (!annualPrice) {
        const priceData = {
          product: stripeProduct.id,
          unit_amount: product.annualAmount,
          currency: 'usd',
          tax_behavior: 'exclusive',
        };

        if (product.monthlyAmount) {
          priceData.recurring = { interval: 'year' };
        }

        annualPrice = await stripe.prices.create(priceData);
        const priceType = product.monthlyAmount ? 'year' : 'one-time';
        console.log(`  ✅ Created ${priceType} price: ${annualPrice.id} ($${(product.annualAmount / 100).toFixed(2)})`);
      } else {
        const priceType = product.monthlyAmount ? 'year' : 'one-time';
        console.log(`  ✅ Using existing ${priceType} price: ${annualPrice.id} ($${(product.annualAmount / 100).toFixed(2)})`);
      }

      // Map to env key
      let key;
      if (product.name === 'Individual Operator') key = 'INDIVIDUAL';
      else if (product.name === 'Builder') key = 'BUILDER';
      else if (product.name === 'Org Leader') key = 'ORGANIZATION';
      else if (product.name === 'Starter') key = 'STARTER';
      else if (product.name === 'Growth') key = 'GROWTH';
      else if (product.name === 'Scale') key = 'SCALE';
      else if (product.name === 'Franchise License') key = 'FRANCHISE';

      if (key) {
        if (product.monthlyAmount) {
          priceIds[`${key}_ANNUAL`] = annualPrice.id;
        } else {
          priceIds[key] = annualPrice.id; // Franchise is one-time only
        }
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
  console.log('Price IDs:');
  console.log('');

  // Output all price IDs
  const envVars = [];
  for (const [key, value] of Object.entries(priceIds)) {
    const envKey = `STRIPE_PRICE_${key}`;
    console.log(`${envKey}=${value}`);
    envVars.push({ key: envKey, value });
  }

  console.log('');
  console.log('==========================================');
  console.log('  Updating .env file...');
  console.log('==========================================');
  console.log('');

  // Update .env file
  if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf8');
    let updated = false;

    // Update or add each price ID
    for (const { key, value } of envVars) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
        console.log(`  ✅ Updated: ${key}`);
        updated = true;
      } else {
        // Add at end of file
        envContent += `\n${key}=${value}\n`;
        console.log(`  ✅ Added: ${key}`);
        updated = true;
      }
    }

    if (updated) {
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('');
      console.log('✅ .env file updated successfully!');
    } else {
      console.log('⚠️  No changes needed in .env file');
    }
  } else {
    console.log('⚠️  .env file not found, creating it...');
    let envContent = '# Stripe Price IDs\n';
    for (const { key, value } of envVars) {
      envContent += `${key}=${value}\n`;
    }
    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log('✅ Created .env file with Price IDs');
  }

  console.log('');
  console.log('==========================================');
  console.log('  Archiving Old Products...');
  console.log('==========================================');
  console.log('');

  // Archive old products
  await archiveOldProducts(priceIds);

  console.log('');
  console.log('✅ Complete!');
}

async function archiveOldProducts(activePriceIds) {
  try {
    // Get all active products
    const allProducts = await stripe.products.list({ limit: 100, active: true });
    
    // Get product IDs from our active prices
    const activeProductIds = new Set();
    for (const priceId of Object.values(activePriceIds)) {
      try {
        const price = await stripe.prices.retrieve(priceId);
        if (price.product) {
          activeProductIds.add(price.product);
        }
      } catch (e) {
        // Price might not exist yet, skip
      }
    }

    // Also get product IDs from our product names
    for (const product of PRODUCTS) {
      const searchResults = await stripe.products.search({
        query: `name:'${product.name}'`,
        limit: 1,
      });
      if (searchResults.data.length > 0) {
        activeProductIds.add(searchResults.data[0].id);
      }
    }

    console.log(`Found ${activeProductIds.size} active products to keep`);
    console.log(`Checking ${allProducts.data.length} total products...`);
    console.log('');

    let archived = 0;
    let kept = 0;

    for (const product of allProducts.data) {
      if (activeProductIds.has(product.id)) {
        console.log(`  ✅ KEEPING: ${product.name} (${product.id})`);
        kept++;
      } else {
        console.log(`  🗑️  ARCHIVING: ${product.name} (${product.id})`);
        try {
          await stripe.products.update(product.id, { active: false });
          archived++;
        } catch (e) {
          console.error(`    ❌ Error archiving: ${e.message}`);
        }
      }
    }

    console.log('');
    console.log(`Summary: ${kept} kept, ${archived} archived`);
  } catch (error) {
    console.error('Error archiving products:', error.message);
  }
}

createOrUpdateProducts().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});


