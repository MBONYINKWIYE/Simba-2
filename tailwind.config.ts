import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          300: '#FDBA74',
          400: '#FB923C',
          500: '#F97316',
          600: '#EA580C',
          700: '#C2410C',
          800: '#9A3412',
          900: '#7C2D12'
        },
        accent: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337'
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
          'radial-gradient(circle at top left, rgba(249, 115, 22, 0.22), transparent 35%), radial-gradient(circle at bottom right, rgba(234, 88, 12, 0.18), transparent 30%)'
      }
    }
  },
  plugins: []
} satisfies Config;
