import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
// Adapter Node pour le dev local. Pour déployer sur Cloudflare Pages :
//   npm rm @astrojs/node && npm i @astrojs/cloudflare
//   import cloudflare from '@astrojs/cloudflare';
//   ... adapter: cloudflare()
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://nayabmarket.fr',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [
    tailwind({ applyBaseStyles: true }),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/commande/') &&
        !page.includes('/succes'),
    }),
  ],
});
