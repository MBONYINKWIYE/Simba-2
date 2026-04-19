import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f6f8eb',
          100: '#e9efd0',
          200: '#d5e0a3',
          300: '#bfd077',
          400: '#adc15a',
          500: '#8ea23e',
          600: '#718230',
          700: '#556323',
          800: '#394316',
          900: '#1c2209'
        },
        accent: {
          50: '#eef8ff',
          100: '#d8eeff',
          200: '#b2deff',
          300: '#7dc7ff',
          400: '#42abff',
          500: '#188fe8',
          600: '#0a71be',
          700: '#0b598f',
          800: '#0e3c5d',
          900: '#0b2132'
        }
      },
      boxShadow: {
        soft: '0 20px 45px -25px rgba(15, 23, 42, 0.35)'
      },
      fontFamily: {
        sans: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'hero-grid':
          'radial-gradient(circle at top left, rgba(142, 162, 62, 0.22), transparent 35%), radial-gradient(circle at bottom right, rgba(24, 143, 232, 0.18), transparent 30%)'
      }
    }
  },
  plugins: []
} satisfies Config;
