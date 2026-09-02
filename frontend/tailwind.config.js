/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: "hsl(224, 40%, 7%)", // #0B0F19
          card: "hsl(223, 33%, 13%)", // #161C2C
        },
        brand: {
          blue: "hsl(217, 91%, 60%)", // #3B82F6
        },
        risk: {
          low: "hsl(159, 84%, 39%)", // #10B981
          medium: "hsl(38, 92%, 50%)", // #F59E0B
          high: "hsl(0, 84%, 60%)", // #EF4444
          critical: "hsl(0, 72%, 35%)", // #991B1B
        }
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        card: "0px 4px 6px rgba(0, 0, 0, 0.2)",
        popup: "0px 10px 15px rgba(0, 0, 0, 0.4)",
      }
    },
  },
  plugins: [],
}
