import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/).filter(Boolean);
  for (const line of lines) {
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

const url = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(url, serviceRoleKey, {
  auth: {
    persistSession: false,
  },
});

const seedPath = path.resolve('supabase', 'seeds', 'catalog-products.json');
const products = JSON.parse(fs.readFileSync(seedPath, 'utf8'));

const chunkSize = 250;
for (let index = 0; index < products.length; index += chunkSize) {
  const chunk = products.slice(index, index + chunkSize);
  const { error } = await supabase.from('catalog_products').upsert(chunk, { onConflict: 'id' });
  if (error) {
    throw error;
  }
  console.log(`Imported rows ${index + 1}-${Math.min(index + chunkSize, products.length)}`);
}

console.log('Supabase import complete');
