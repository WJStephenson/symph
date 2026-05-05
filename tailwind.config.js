/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "DM Sans",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        display: ["Outfit", "DM Sans", "system-ui", "sans-serif"]
      },
      boxShadow: {
        glow: "0 0 60px -12px var(--tw-shadow-color, rgba(99,102,241,0.35))"
      }
    }
  },
  plugins: []
};
