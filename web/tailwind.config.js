/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#4A2C0A',
        secondary: '#8B5E3C',
        accent: '#C49A6C',
        cream: '#F5EFE6',
        'gray-soft': '#E8E0D8',
        'black-soft': '#1A1A1A',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
