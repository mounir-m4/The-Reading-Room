/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#FAF9F6',
        sand: '#F0EDE6',
        ink: '#242424',
        muted: '#777777',
        burgundy: { DEFAULT: '#783D45', dark: '#5E2E35', light: '#9B5861' },
        gold: { DEFAULT: '#B89B64', light: '#D6C39A' },
        line: '#E6E2D9',
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['"Noto Kufi Arabic"', 'Tajawal', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 18px rgba(36,36,36,.06)',
        lift: '0 18px 45px rgba(36,36,36,.12)',
      },
      keyframes: {
        fadeUp: { '0%': { opacity: 0, transform: 'translateY(12px)' }, '100%': { opacity: 1, transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fadeUp .6s ease-out both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};
