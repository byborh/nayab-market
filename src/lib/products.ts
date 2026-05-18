import data from '~/data/products.json';
import { fetchProductsFromFirestore, firestoreReady } from '~/lib/firestore-rest';

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

/** Catalogue de secours (utilisé tant que Firestore n'est pas configuré). */
export const fallbackProducts: Product[] = data.products;
export const categories: Category[] = data.categories;

/**
 * Source unique de produits : Firestore si configuré et accessible,
 * sinon le seed products.json. À appeler depuis les pages Astro (await).
 */
export async function getProducts(): Promise<Product[]> {
  if (!firestoreReady) return fallbackProducts;
  const firestoreProducts = await fetchProductsFromFirestore();
  if (!firestoreProducts || firestoreProducts.length === 0) {
    return fallbackProducts;
  }
  return firestoreProducts;
}

export async function getProductBySlug(slug: string): Promise<Product | undefined> {
  const all = await getProducts();
  return all.find((p) => p.slug === slug);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const all = await getProducts();
  return all.find((p) => p.id === id);
}

export async function getProductsByCategory(categoryId: string): Promise<Product[]> {
  const all = await getProducts();
  return all.filter((p) => p.category === categoryId);
}

export function formatPrice(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

// Legacy: anciens appels synchrones vers `products`. On garde l'export pour compat,
// mais préfère `await getProducts()` dans les nouveaux composants.
export const products: Product[] = fallbackProducts;
