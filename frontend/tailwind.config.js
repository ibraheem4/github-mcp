/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#000000",
        foreground: "#ffffff",
        primary: {
          DEFAULT: "#2563eb",
          foreground: "#ffffff",
        },
        secondary: {
          DEFAULT: "#475569",
          foreground: "#ffffff",
        },
        muted: {
          DEFAULT: "#334155",
          foreground: "#94a3b8",
        },
        accent: {
          DEFAULT: "#0ea5e9",
          foreground: "#ffffff",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
