import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        steel: "#475569",
        line: "#d8dee8",
        forge: "#1f6f78",
        accent: "#b06b34"
      },
      boxShadow: {
        panel: "0 12px 36px rgba(23, 32, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
