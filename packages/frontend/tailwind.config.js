/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          200: "#c7d2fe",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4F46E5",
          700: "#4338ca",
          800: "#3730a3",
          900: "#312e81"
        },
        mint: "#c9f7d7",
        ink: "#10172a",
        sand: "#f7f4ed"
      },
      boxShadow: {
        soft: "0 20px 50px rgba(15, 23, 42, 0.08)",
        float: "0 24px 60px rgba(79, 70, 229, 0.18)"
      },
      fontFamily: {
        sans: ["Satoshi", "Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      backgroundImage: {
        "hero-grid":
          "radial-gradient(circle at top left, rgba(79,70,229,0.16), transparent 30%), radial-gradient(circle at bottom right, rgba(16,185,129,0.12), transparent 28%)"
      }
    }
  },
  plugins: []
};
