// Lecture Firestore côté serveur via l'API REST publique.
// Pas besoin du SDK Admin : on lit avec les règles publiques Firestore
// (cf. README pour les règles à coller dans la console).

import type { Product } from '~/lib/products';

const projectId = import.meta.env.PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = import.meta.env.PUBLIC_FIREBASE_API_KEY;

export const firestoreReady = Boolean(projectId && apiKey);

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null };

type FirestoreDocument = {
  name: string;
  fields: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
};

function unwrap(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('timestampValue' in value) return value.timestampValue;
  return null;
}

function docToProduct(doc: FirestoreDocument): Product | null {
  const id = doc.name.split('/').pop()!;
  const fields = doc.fields || {};
  const get = (k: string) => (fields[k] ? unwrap(fields[k]) : undefined);

  const name = get('name') as string | undefined;
  const priceCents = get('priceCents') as number | undefined;
  if (!name || typeof priceCents !== 'number') return null;

  return {
    id,
    slug: (get('slug') as string) || id,
    name,
    category: (get('category') as string) || 'epicerie',
    description: (get('description') as string) || '',
    shortDescription: (get('shortDescription') as string) || '',
    priceCents,
    currency: (get('currency') as string) || 'eur',
    unit: (get('unit') as string) || '',
    image: (get('image') as string) || '',
    stock: (get('stock') as number) ?? 0,
  };
}

/**
 * Récupère tous les produits depuis Firestore via l'API REST.
 * Retourne null si Firebase n'est pas configuré ou en cas d'erreur réseau
 * (l'appelant retombera sur products.json).
 */
export async function fetchProductsFromFirestore(): Promise<Product[] | null> {
  if (!firestoreReady) return null;

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/products?key=${apiKey}&pageSize=300`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const json = (await res.json()) as { documents?: FirestoreDocument[] };
    if (!json.documents) return [];
    return json.documents.map(docToProduct).filter((p): p is Product => p !== null);
  } catch {
    return null;
  }
}
