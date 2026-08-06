/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F0F4FA',
          100: '#D9E2EC',
          500: '#1B365D',
          800: '#0E2447',
          900: '#0B1D3D',
        },
        gold: {
          400: '#E5C158',
          500: '#D4AF37',
          600: '#B89327',
        },
        bgLight: '#F7F8FA',
        grayLight: '#E9EDF2',
      },
    },
  },
  plugins: [],
};
