import type { Config } from 'tailwindcss';
export default {
  darkMode: ['class', 'dark'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
        sketch: ['var(--font-sketch)', 'cursive'],
      },
      borderRadius: {
        '2xl': '1rem',
      },
      keyframes: {
        paint: {
          '0%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
          '100%': { backgroundPosition: '0% 50%' },
        },
      },
      animation: {
        paint: 'paint 15s ease infinite',
      },
      backgroundImage: {
        paintdots:
          'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.08) 0 2px, transparent 2px),\n radial-gradient(circle at 80% 30%, rgba(255,255,255,0.06) 0 2px, transparent 2px),\n radial-gradient(circle at 40% 80%, rgba(255,255,255,0.05) 0 2px, transparent 2px),\n linear-gradient(120deg, rgba(99,102,241,0.25), rgba(20,184,166,0.25), rgba(244,63,94,0.25))',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
