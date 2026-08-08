import type { Config } from 'tailwindcss';

/**
 * Paleta y tipografía tomadas del Manual de Identidad Gráfica v1.0.
 * No agregar verdes fuera de esta lista: el manual lo prohíbe
 * ("No cambiar los verdes de forma arbitraria").
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta principal
        noche: '#0A2F0F',
        mojito: '#309830',
        lima: '#43B33C',
        espuma: '#FFFFFF',
        // Paleta secundaria
        hoja: '#1F6821',
        menta: '#A0E09B',
        'lima-pale': '#DDF3B5',
        carbon: '#162018',
        // Utilitarios derivados
        borde: '#D6E4D4',
      },
      fontFamily: {
        display: ['var(--font-fredoka)', 'Arial Rounded MT Bold', 'system-ui', 'sans-serif'],
        sans: ['var(--font-nunito)', 'Arial', 'sans-serif'],
        data: ['var(--font-dm-sans)', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        sm: '12px',
        md: '18px',
        lg: '28px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 12px 32px rgba(10, 47, 15, 0.10)',
        'card-hover': '0 20px 44px rgba(10, 47, 15, 0.16)',
studio: '0 2px 8px rgba(10, 47, 15, 0.06)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
