/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: '#EA580C',
        ink: '#0A0F1F',
        muted: '#A3A3A3',
      },
      boxShadow: {
        soft: '0 8px 24px rgba(15, 23, 42, 0.18)',
      },
    },
  },
  plugins: [],
};
