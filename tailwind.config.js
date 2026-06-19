/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Notion-inspired neutral palette.
        notion: {
          bg: '#ffffff',
          'bg-dark': '#191919',
          sidebar: '#f7f7f5',
          'sidebar-dark': '#202020',
          text: '#37352f',
          'text-dark': '#d4d4d4',
          muted: '#9b9a97',
          border: '#e9e9e7',
          'border-dark': '#2f2f2f',
          hover: '#efefef',
          'hover-dark': '#2c2c2c',
          accent: '#2383e2',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Helvetica',
          'Apple Color Emoji',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};
