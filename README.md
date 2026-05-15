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

Édite `src/data/products.json`, push, et c'est en ligne après build.

Champs requis : `id`, `slug`, `name`, `category`, `description`, `shortDescription`,
`priceCents` (1490 = 14,90 €), `currency` ("eur"), `unit`, `image`, `stock`.

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
