// Firebase Admin SDK : usage serveur uniquement (API routes, webhook).
// Initialisation paresseuse — l'app n'est créée qu'au premier appel et seulement
// si toutes les variables sont configurées.

import { cert, getApp, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, type Auth } from 'firebase-admin/auth';

const projectId = import.meta.env.FIREBASE_PROJECT_ID;
const clientEmail = import.meta.env.FIREBASE_CLIENT_EMAIL;
const privateKeyRaw = import.meta.env.FIREBASE_PRIVATE_KEY;

export const adminReady = Boolean(projectId && clientEmail && privateKeyRaw);

let app: App | null = null;
let firestore: Firestore | null = null;
let auth: Auth | null = null;

function ensureApp(): App | null {
  if (!adminReady) return null;
  if (app) return app;
  if (getApps().length > 0) {
    app = getApp();
    return app;
  }
  // Les .env stockent la clé privée avec des \n littéraux : on les ré-injecte.
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n');
  app = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
  return app;
}

export function getAdminFirestore(): Firestore | null {
  const a = ensureApp();
  if (!a) return null;
  if (!firestore) {
    firestore = getFirestore(a);
    // Firestore refuse les `undefined` par défaut. Comme les payloads Stripe
    // contiennent souvent des champs optionnels non renseignés (phone, line2…),
    // on demande à Firestore de simplement les ignorer plutôt que de planter.
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

export function getAdminAuth(): Auth | null {
  const a = ensureApp();
  if (!a) return null;
  if (!auth) auth = getAuth(a);
  return auth;
}

export { FieldValue };
