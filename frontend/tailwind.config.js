/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Quicksand', 'sans-serif'] },
      keyframes: {
        wiggle: {
          '0%, 100%': { transform: 'rotate(-6deg)' },
          '50%':       { transform: 'rotate(6deg)' },
        }
      },
      animation: {
        wiggle: 'wiggle 0.5s ease-in-out 3',
      }
    }
  },
  plugins: [],
}