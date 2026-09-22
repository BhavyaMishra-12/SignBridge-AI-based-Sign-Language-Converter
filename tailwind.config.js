/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}", "./public/train.html", "./public/train-page.js"],
  darkMode: "class",
  theme: {
    extend: {
      boxShadow: {
        'skeuo': '8px 8px 16px #d8d4c9, -8px -8px 16px #ffffff',
        'skeuo-inner': 'inset 4px 4px 8px #d8d4c9, inset -4px -4px 8px #ffffff',
        'skeuo-dark': '8px 8px 16px #050505, -8px -8px 16px #1a1a1a',
        'skeuo-inner-dark': 'inset 4px 4px 8px #050505, inset -4px -4px 8px #1a1a1a',
        'skeuo-btn': '4px 4px 8px #d8d4c9, -4px -4px 8px #ffffff',
        'skeuo-btn-pressed': 'inset 4px 4px 8px #d8d4c9, inset -4px -4px 8px #ffffff',
        'skeuo-btn-dark': '4px 4px 8px #050505, -4px -4px 8px #1a1a1a',
        'skeuo-btn-pressed-dark': 'inset 4px 4px 8px #050505, inset -4px -4px 8px #1a1a1a',
      }
    },
  },
  plugins: [],
};
