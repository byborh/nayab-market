import data from '~/data/products.json';

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  shortDescription: string;
  priceCents: number;
  currency: string;
  unit: string;
  image: string;
  stock: number;
};

export type Category = {
  id: string;
  name: string;
  emoji: string;
};

export const products: Product[] = data.products;
export const categories: Category[] = data.categories;

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return products.filter((p) => p.category === categoryId);
}

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
