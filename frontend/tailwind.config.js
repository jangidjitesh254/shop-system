/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae6ff',
          500: '#4f7cff',
          600: '#3b63e8',
          700: '#2f4fc4',
        },
      },
    },
  },
  plugins: [],
};
