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
        // Paleta Supabase / Grafito Moderno
        dark: {
          bg: '#121212',
          surface: '#18181B',
          card: '#1E1E24',
          input: '#09090B',
          border: '#27272A',
          borderLight: '#3F3F46'
        },
        light: {
          bg: '#FAFAFA',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          input: '#FFFFFF',
          border: '#E4E4E7',
          borderDark: '#D4D4D8'
        },
        // Acento de marca (Rojo / Rose FMC)
        brand: {
          50: '#FFF1F2',
          100: '#FFE4E6',
          200: '#FECDD3',
          300: '#FDA4AF',
          400: '#FB7185',
          500: '#F43F5E',
          600: '#E11D48',
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
          DEFAULT: '#E11D48'
        },
        // Colores de estado de servicios técnicos
        status: {
          recibido: '#71717A',
          diagnostico: '#38BDF8',
          repuesto: '#FBBF24',
          reparacion: '#A855F7',
          control: '#F472B6',
          listo: '#34D399',
          entregado: '#059669',
          cancelado: '#EF4444'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-brand': '0 0 20px -5px rgba(225, 29, 72, 0.35)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        'card-light': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
