/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        feather: ['"Nunito"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        serif: ['"Nunito"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"Nunito Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        'eager-green': '#58cc02',
        'storybook-green': '#d7ffb8',
        'spark-blue': '#1cb0f6',
        'fresh-leaf': '#a5ed6e',
        'night-ink': '#000437',
        'paper-white': '#ffffff',
        'charcoal': '#4b4b4b',
        'pencil-gray': '#777777',
        'faded-gray': '#afafaf',
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '12px',
      },
      keyframes: {
        scanline: {
          '0%': { top: '4%', opacity: '0.85' },
          '50%': { top: '92%', opacity: '1' },
          '100%': { top: '4%', opacity: '0.85' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      animation: {
        scanline: 'scanline 4.5s ease-in-out infinite',
        fadeIn: 'fadeIn 0.25s ease-out forwards'
      }
    },
  },
  plugins: [],
}
