import fs from 'node:fs';
import path from 'node:path';

const sourcePath = path.resolve('simba_products.json');
const publicPath = path.resolve('public', 'simba_products.json');
const targetDir = path.resolve('supabase', 'seeds');
const targetPath = path.join(targetDir, 'catalog-products.json');

const sourceText = fs.readFileSync(sourcePath, 'utf8');
const raw = JSON.parse(sourceText);

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
fs.mkdirSync(path.dirname(publicPath), { recursive: true });
fs.writeFileSync(publicPath, sourceText);
fs.writeFileSync(targetPath, JSON.stringify(rows, null, 2));

console.log(`Synced fallback catalog to ${publicPath}`);
console.log(`Prepared ${rows.length} rows for Supabase at ${targetPath}`);
