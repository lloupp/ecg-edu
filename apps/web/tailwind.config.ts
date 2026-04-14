import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#f6f4ee',
        foreground: '#151b1f',
        card: '#fffdf7',
        border: '#d4c8b5',
        accent: '#b53c2c',
        accentSoft: '#f4d8ca',
        secondary: '#16313e',
        muted: '#ebe4d8',
        success: '#2f6b4f',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
      },
      boxShadow: {
        panel: '0 18px 50px rgba(21, 27, 31, 0.08)',
      },
      backgroundImage: {
        grid: 'linear-gradient(rgba(21,27,31,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(21,27,31,0.06) 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
