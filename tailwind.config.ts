import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f4efdf",
        paper2: "#ece5d2",
        ink: "#121212",
        crimson: "#ed3d2b",
        gold: "#ffd438",
        muted: "#777164",
      },
      fontFamily: {
        display: ['"Space Grotesk"', "Arial", "sans-serif"],
        mono: ['"DM Mono"', "monospace"],
      },
      boxShadow: {
        hard: "8px 8px 0 #121212",
        hardsm: "4px 4px 0 #121212",
      },
    },
  },
  plugins: [],
};

export default config;
