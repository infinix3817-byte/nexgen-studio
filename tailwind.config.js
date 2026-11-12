/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: { colors: { studio: '#09090d' }, fontFamily: { sans: ['Arial', 'sans-serif'] } } },
  plugins: [],
};
