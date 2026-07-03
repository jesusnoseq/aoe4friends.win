/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink:       { 900: '#0a0c10', 800: '#11151b', 700: '#1a1f28' },
        leather:   { 900: '#2a211c', 800: '#3a2e25', 700: '#4a3a2d', 600: '#5a4636' },
        parchment: { 100: '#f4e9d0', 200: '#e8d8b0', 300: '#d8c08f' },
        gold:      { 300: '#f0cc8c', 400: '#e3b878', 500: '#c9a35a', 600: '#a8813f', 700: '#7a5c2a' },
        navy:      { 400: '#3d5a80', 500: '#2b4a6f', 600: '#1e3a5f', 700: '#15294a' },
        oxblood:   { 400: '#a24238', 500: '#7d2b22', 600: '#5f1e18' },
        moss:      { 400: '#8fab6e', 500: '#6c8a4f', 600: '#52703c' },
        steel:     { 400: '#9aa3ad', 500: '#6c7680' },
      },
      fontFamily: {
        display: ['Cinzel', 'Georgia', 'serif'],
        body: ['"EB Garamond"', 'Georgia', 'serif'],
      },
      boxShadow: {
        emboss: 'inset 0 1px 0 rgba(231,189,127,.15), inset 0 -1px 0 rgba(0,0,0,.45), 0 4px 14px rgba(0,0,0,.5)',
        glow: '0 0 0 1px rgba(201,163,90,.45), 0 0 18px rgba(201,163,90,.25)',
      },
      backgroundImage: {
        'leather-texture': 'radial-gradient(circle at 20% 10%, rgba(120,90,50,.05), transparent 50%), radial-gradient(circle at 80% 80%, rgba(60,40,20,.08), transparent 55%)',
      },
    },
  },
  plugins: [],
};