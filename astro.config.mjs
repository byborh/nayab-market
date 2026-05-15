import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';

// https://astro.build/config
// Adapter Node pour le dev local. Pour déployer sur Cloudflare Pages :
//   npm rm @astrojs/node && npm i @astrojs/cloudflare
//   import cloudflare from '@astrojs/cloudflare';
//   ... adapter: cloudflare()
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [tailwind({ applyBaseStyles: true })],
});
