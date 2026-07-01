import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          white:          '#FFFFFF',
          'light-grey':   '#E8EEF5',
          'light-grey2':  '#F0F3F9',
          purple:         '#6B21E8',
          'purple-dark':  '#5016C8',
          'purple-muted': '#EDE9FE',
          teal:           '#00C5B5',
          'teal-dark':    '#00A896',
          lime:           '#8CC83C',
          charcoal:       '#252B35',
          'grey-500':     '#5A6478',
          'grey-300':     '#B8C0D0',
          'grey-100':     '#EEF1F7',
          pink:           '#E91E8C',
          lemon:          '#F0E040',
          green:          '#48C25A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        xs:     '0 1px 2px rgba(0,0,0,0.05)',
        sm:     '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        md:     '0 4px 6px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)',
        lg:     '0 10px 15px rgba(0,0,0,0.06), 0 4px 6px rgba(0,0,0,0.04)',
        purple: '0 0 0 3px rgba(107,33,232,0.15)',
      },
    },
  },
  plugins: [],
};

export default config;
