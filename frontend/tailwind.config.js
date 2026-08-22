/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ["Newsreader", "Georgia", "serif"],
        sans: ["'Plus Jakarta Sans'", "system-ui", "sans-serif"],
      },
      colors: {
        cream: {
          50: "#FAF7F2",
          100: "#F7F4EF",
          200: "#EFECE6",
          300: "#E5E0D8",
        },
        terracotta: {
          50: "#FAF2EF",
          100: "#F5E4DF",
          500: "#C86D51",
          600: "#B0583D",
          700: "#94442B",
        },
        sage: {
          50: "#F0F6F2",
          100: "#E2ECE5",
          500: "#4A8B6E",
          600: "#3B735A",
          700: "#2D5A46",
        },
        gold: {
          50: "#FAF6EE",
          100: "#F5EDE0",
          600: "#9E7230",
        },
        ink: {
          500: "#78736B",
          800: "#2B2825",
          900: "#1E1B18",
        },
      },
    },
  },
  plugins: [],
};
