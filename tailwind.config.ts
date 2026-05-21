import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        bg: { DEFAULT: "#FFFFFF", card: "#F8FAFC" },
        text: { DEFAULT: "#0F172A", sub: "#475569" },
        accent: "#1E40AF",
        up: "#16A34A",
        down: "#DC2626",
        warn: "#D97706",
        border: "#E2E8F0",
      },
      fontFamily: {
        sans: ['"Pretendard"', "ui-sans-serif", "system-ui", "sans-serif"],
        num: ['"Pretendard"', "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
