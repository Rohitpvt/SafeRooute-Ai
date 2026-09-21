/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        asterix: {
          bg: "#050505",
          surface: "#0F0F0F",
          primary: "#F97316",
          hover: "#FB923C",
          border: "rgba(255, 255, 255, 0.1)",
          glow: "rgba(249, 115, 22, 0.2)",
        },
        primary: {
          dark: "#050505", // Asterix Deep Void
          card: "#0F0F0F", // Asterix Surface Depth
        },
        brand: {
          blue: "#3B82F6",
          orange: "#F97316",
        },
        risk: {
          low: "hsl(159, 84%, 39%)", // #10B981
          medium: "hsl(38, 92%, 50%)", // #F59E0B
          high: "hsl(0, 84%, 60%)", // #EF4444
          critical: "hsl(0, 72%, 35%)", // #991B1B
        }
      },
      fontFamily: {
        display: ["Geist", "Inter", "sans-serif"],
        serif: ["'Instrument Serif'", "serif"],
        sans: ["Inter", "sans-serif"],
        mono: ["'Geist Mono'", "monospace"],
      },
      borderRadius: {
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: "0px 4px 20px rgba(0, 0, 0, 0.5)",
        popup: "0px 10px 30px rgba(0, 0, 0, 0.8)",
        glow: "0 0 40px -10px rgba(249, 115, 22, 0.35)",
        'glow-lg': "0 0 60px -15px rgba(249, 115, 22, 0.45)",
      }
    },
  },
  plugins: [],
}
