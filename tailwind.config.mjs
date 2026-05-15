/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        // Palette afghane — lapis, safran, grenade, terre
        lapis: {
          50: '#eef3fb',
          100: '#d8e3f4',
          200: '#a8bfe2',
          300: '#7799ce',
          400: '#4a74b8',
          500: '#26509b',
          600: '#1a3d7c',
          700: '#142e5d',
          800: '#0d1f3f',
          900: '#070f20',
        },
        saffron: {
          50: '#fff8e6',
          100: '#ffeab2',
          200: '#ffd97a',
          300: '#ffc445',
          400: '#f5ab1c',
          500: '#d68b08',
          600: '#a96a04',
          700: '#7d4d03',
          800: '#523203',
          900: '#2a1a02',
        },
        pomegranate: {
          50: '#fbeaea',
          100: '#f4c5c5',
          200: '#e88a8a',
          300: '#d95252',
          400: '#c52a2a',
          500: '#9b1c1c',
          600: '#751515',
          700: '#5b1010',
          800: '#3d0a0a',
          900: '#200505',
        },
        sand: {
          50: '#fbf7ef',
          100: '#f3ead4',
          200: '#e6d2a4',
          300: '#d7b974',
          400: '#c4a04d',
          500: '#a98432',
          600: '#866526',
          700: '#624a1c',
          800: '#3f3013',
          900: '#22190a',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        sans: ['Poppins', 'system-ui', 'sans-serif'],
        accent: ['"Cormorant Garamond"', 'serif'],
      },
      backgroundImage: {
        'kilim-pattern':
          "radial-gradient(circle at 20% 50%, rgba(214, 139, 8, 0.18) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(155, 28, 28, 0.18) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};
