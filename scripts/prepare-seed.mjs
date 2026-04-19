import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('simba_products.json');
const targetDir = path.resolve('supabase', 'seeds');
const targetPath = path.join(targetDir, 'catalog-products.json');

const raw = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const slugify = (value) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const rows = raw.products.map((product) => ({
  id: product.id,
  slug: `${slugify(product.name)}-${product.id}`,
  name: product.name,
  category_name: product.category.trim(),
  raw_subcategory_id: product.subcategoryId ?? null,
  price_rwf: Math.round(product.price),
  in_stock: Boolean(product.inStock),
  unit_label: product.unit ?? 'Pcs',
  image_url: product.image,
  metadata: {
    import_source: 'simba_products.json',
  },
}));

fs.mkdirSync(targetDir, { recursive: true });
fs.writeFileSync(targetPath, JSON.stringify(rows, null, 2));

console.log(`Prepared ${rows.length} rows for Supabase at ${targetPath}`);
