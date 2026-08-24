/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          bg: "#0a0a0f",
          grid: "#1a1a2e",
          node: "#12121e",
          border: "#2a2a3e",
          accent: "#6366f1",
          success: "#22c55e",
          error: "#ef4444",
          running: "#3b82f6",
        },
      },
      animation: {
        "edge-flow": "edgeFlow 2s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        edgeFlow: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
