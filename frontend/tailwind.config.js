/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#031c30'
        },
        slate: {
          850: '#1e293b',
          950: '#0b0f19'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.75rem', { lineHeight: '1rem' }],       // 12px
        'xs': ['0.875rem', { lineHeight: '1.25rem' }],     // 14px (previously was 12px)
        'sm': ['0.95rem', { lineHeight: '1.45rem' }],      // 15.2px (previously was 14px)
        'base': ['1.0625rem', { lineHeight: '1.65rem' }],  // 17px (previously was 16px)
        'lg': ['1.25rem', { lineHeight: '1.8rem' }],       // 20px (previously was 18px)
        'xl': ['1.5rem', { lineHeight: '2.1rem' }],        // 24px (previously was 20px)
        '2xl': ['1.875rem', { lineHeight: '2.35rem' }],    // 30px (previously was 24px)
        '3xl': ['2.25rem', { lineHeight: '2.6rem' }],      // 36px (previously was 30px)
        '4xl': ['2.75rem', { lineHeight: '1.15' }],        // 44px (previously was 36px)
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      }
    },
  },
  plugins: [],
}
