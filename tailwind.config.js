/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        espresso: '#2C1A0E',
        gold: '#B5935A',
        'gold-light': '#D4AF7A',
        blush: '#F2E0D5',
        cream: '#FAF7F2',
        'text-dark': '#1A0F07',
        'text-light': '#FAF7F2',
      },
      fontFamily: {
        cormorant: ['"Cormorant Garamond"', 'serif'],
        dm: ['"DM Sans"', 'sans-serif'],
        playfair: ['"Playfair Display"', 'serif'],
      },
      borderRadius: {
        btn: '4px',
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 40px rgba(44,26,14,0.12)',
      },
    },
  },
  plugins: [],
}
