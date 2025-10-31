/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pumpkin: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f7931e',
          600: '#ff6b35',
          700: '#ea580c',
          800: '#c2410c',
          900: '#9a3412',
        },
        spooky: {
          50: '#f5e6ff',
          100: '#e6ccff',
          200: '#d4b3ff',
          300: '#9d4edd',
          400: '#7209b7',
          500: '#4a1f75',
          600: '#2d1b4e',
          700: '#1a0b2e',
          800: '#140a24',
          900: '#0a0513',
        },
        eerie: {
          50: '#f0fff4',
          100: '#c6f6d5',
          200: '#9ae6b4',
          300: '#68d391',
          400: '#39ff14',
          500: '#06ffa5',
          600: '#00ff88',
          700: '#00cc6a',
          800: '#00994f',
          900: '#006633',
        },
        midnight: {
          50: '#2d2d37',
          100: '#1f1f2e',
          200: '#1a1a2e',
          300: '#16161f',
          400: '#1a1a1f',
          500: '#0f0f14',
          600: '#0a0a0f',
          700: '#050508',
          800: '#030305',
          900: '#000000',
        },
      },
      boxShadow: {
        'glow-pumpkin': '0 0 20px rgba(247, 147, 30, 0.6), 0 0 40px rgba(255, 107, 53, 0.4)',
        'glow-eerie': '0 0 20px rgba(0, 255, 136, 0.5), 0 0 40px rgba(57, 255, 20, 0.3)',
        'glow-spooky': '0 0 20px rgba(157, 78, 221, 0.5), 0 0 40px rgba(114, 9, 183, 0.3)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px currentColor)' },
          '50%': { opacity: 0.7, filter: 'drop-shadow(0 0 20px currentColor)' },
        },
      },
    },
  },
  plugins: [],
};
