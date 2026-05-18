# Nayab Market — site e-commerce

Site vitrine + boutique en ligne pour **Nayab Market**, épicerie afghane au 4 place de la Chapelle, Paris.

## Stack

- **Astro 4** (SSR mode, adapter Cloudflare)
- **Tailwind CSS 3** — palette afghane (lapis, safran, grenade, sable)
- **Stripe Checkout** — paiement hébergé
- **Firebase** (optionnel) — auth admin + Firestore pour les commandes
- **Cloudflare Pages** — hébergement cible (déploiement via `npm run build`)

## Démarrage rapide

```bash
# 1. Installer
npm install

# 2. Configurer
cp .env.example .env
# → Remplir STRIPE_SECRET_KEY (sk_test_... depuis https://dashboard.stripe.com/test/apikeys)

# 3. Lancer
npm run dev
# → http://localhost:4321

# 4. (Optionnel, pour tester les webhooks Stripe en local)
# Dans un autre terminal :
stripe listen --forward-to localhost:4321/api/webhook
# → copier le whsec_... affiché dans STRIPE_WEBHOOK_SECRET du .env
```

## Structure

```
src/
├── components/        # Sections de page (Hero, About, Categories...)
├── data/products.json # Catalogue produits (édite ici puis push pour mettre à jour)
├── layouts/Layout.astro
├── lib/
│   ├── products.ts    # Helpers catalogue
│   └── firebase.ts    # Init Firebase (optionnel)
└── pages/
    ├── index.astro       # Accueil
    ├── boutique.astro    # Catalogue + filtres
    ├── produit/[slug].astro
    ├── panier.astro      # Panier (localStorage)
    ├── succes.astro      # Après paiement
    └── api/
        ├── checkout.ts   # Crée la session Stripe
        └── webhook.ts    # Reçoit les événements Stripe
```

## Ajouter un produit

Deux options :

**Via Firebase (recommandé pour le client)** — espace admin web à `/admin` :
- Le gérant se connecte avec email/mot de passe
- Ajoute / modifie / supprime les produits en ligne, en temps réel
- Voir section "Configuration Firebase" ci-dessous

**En statique** — édite `src/data/products.json`, push, c'est en ligne après build.
Utilisé en fallback quand Firebase n'est pas configuré.

Champs : `id`, `slug`, `name`, `category`, `description`, `shortDescription`,
`priceCents` (1490 = 14,90 €), `currency` ("eur"), `unit`, `image`, `stock`.

## Configuration Firebase (espace admin)

### 1. Créer le projet Firebase

1. https://console.firebase.google.com → "Ajouter un projet" → `nayab-market`
2. Désactiver Google Analytics (pas nécessaire)
3. Une fois créé : ⚙️ → "Paramètres du projet" → "Vos applications" → icône `</>` web → enregistrer une app
4. Copier les valeurs `apiKey`, `authDomain`, `projectId`, etc. dans le `.env` :

```
PUBLIC_FIREBASE_API_KEY=AIza...
PUBLIC_FIREBASE_AUTH_DOMAIN=nayab-market.firebaseapp.com
PUBLIC_FIREBASE_PROJECT_ID=nayab-market
PUBLIC_FIREBASE_STORAGE_BUCKET=nayab-market.firebasestorage.app
PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
PUBLIC_FIREBASE_APP_ID=...
```

### 2. Activer l'authentification

Console Firebase → **Authentication** → "Commencer" → onglet "Sign-in method" → activer **Email/Password**.

Puis onglet **Users** → "Add user" → renseigner l'email + mot de passe du gérant.
C'est ce compte qui pourra se connecter sur `/admin`.

### 3. Activer Firestore

Console → **Firestore Database** → "Créer une base de données" → mode **production** → région `eur3` (Europe).

### 4. Coller les règles de sécurité

Firestore → onglet **Règles** → remplacer par :

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Catalogue : lecture publique, écriture pour utilisateurs authentifiés
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    // Commandes (à venir) : ni lecture ni écriture côté client
    match /orders/{orderId} {
      allow read, write: if false;
    }
  }
}
```

Cliquer **Publier**.

### 5. Premier import

1. Relancer `npm run dev`
2. Aller sur http://localhost:4321/admin
3. Se connecter avec le compte créé à l'étape 2
4. Cliquer **"Importer le seed"** pour pousser les 12 produits de `products.json` dans Firestore
5. Voilà — la boutique lit maintenant les données depuis Firestore

### Notes

- Les images sont stockées en base64 directement dans le document Firestore (taille max ~1 Mo par doc, donc OK pour des images < 1000px de côté).
- Pour des photos plus lourdes, passer à Firebase Storage ou Cloudinary plus tard.
- L'API checkout Stripe valide les prix côté serveur via l'API REST Firestore — un client malveillant ne peut pas modifier les prix.

## Déploiement Cloudflare Pages

1. Push le repo sur GitHub.
2. Cloudflare Pages → "Create project" → connecter le repo.
3. Build command : `npm run build`
4. Output directory : `dist`
5. Variables d'environnement (Cloudflare Pages → Settings → Environment variables) :
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `PUBLIC_SITE_URL` (ex: `https://nayab-market.pages.dev`)
   - Les `PUBLIC_FIREBASE_*` si tu actives Firebase
6. Sur le dashboard Stripe → Webhooks → ajouter `https://<ton-domaine>/api/webhook` (event : `checkout.session.completed`).

## TODO côté business

- [ ] Remplacer les photos Unsplash par les vraies photos du magasin / produits
- [ ] Numéro de téléphone réel dans `src/components/Footer.astro` et `src/components/Header.astro`
- [ ] Mentions légales / CGV (page `/mentions-legales`)
- [ ] Connecter Firebase pour gérer les produits depuis un back-office (comme etoile-orient)
- [ ] Email de confirmation de commande (Stripe le gère déjà via dashboard, ou utilise Resend dans le webhook)
