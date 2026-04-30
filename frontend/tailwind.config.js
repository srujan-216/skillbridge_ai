/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#6d28d9",
          700: "#5b21b6",
          800: "#4c1d95",
          900: "#2e1065",
        },
        indigo2: {
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
        ink: {
          900: "#0b0b1a",
          800: "#111128",
          700: "#1a1a35",
          600: "#24244a",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(109,40,217,0.45)",
        card: "0 1px 3px rgba(0,0,0,0.05), 0 10px 25px -10px rgba(79,70,229,0.12)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg,#6D28D9 0%,#4F46E5 50%,#6366F1 100%)",
        "gradient-radial": "radial-gradient(circle at top,var(--tw-gradient-stops))",
      },
      animation: {
        "gradient-x": "gradient-x 8s ease infinite",
        "float-slow": "float 6s ease-in-out infinite",
        shimmer: "shimmer 2.2s linear infinite",
      },
      keyframes: {
        "gradient-x": {
          "0%,100%": { "background-position": "0% 50%" },
          "50%": { "background-position": "100% 50%" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { "background-position": "-400px 0" },
          "100%": { "background-position": "400px 0" },
        },
      },
    },
  },
  plugins: [],
};
