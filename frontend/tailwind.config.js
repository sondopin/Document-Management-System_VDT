/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: [
          "DM Serif Display",
          "-apple-system",
          "Roboto",
          "Helvetica",
          "sans-serif",
        ],
        sans: ["DM Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
