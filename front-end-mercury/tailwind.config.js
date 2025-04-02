/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Ensure all components and pages are included
    "./public/index.html",        // Include the HTML file if Tailwind classes are used there
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
