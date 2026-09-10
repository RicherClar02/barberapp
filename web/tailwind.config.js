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
        muted: '#9E8670',
        'gray-soft': '#E8E0D8',
        'black-soft': '#1A1A1A',
        success: '#27AE60',
        // warning = "requiere acción", no error. Terracota: secondary corrido
        // hacia el rojo, para que pertenezca a la paleta marrón cuero y no se
        // confunda ni con PENDING ni con destructive.
        warning: '#A65E2E',
        'warning-bg': '#F0DFD0',
        destructive: '#EF4444',
        whatsapp: '#25D366',
      },
      boxShadow: {
        card: '0 2px 8px rgba(74,44,10,0.08)',
      },
      fontFamily: {
        heading: ['Poppins', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
