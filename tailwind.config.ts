import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#F7F6F2",
        foreground: "#111111",
        surface: "#FFFFFF",
        muted: "#6B6B67",
        border: "#D8D6D0",
        "border-strong": "#111111",
        gold: {
          DEFAULT: "#E7B93C",
          light: "#FDF4DB",
          dark: "#B88E18",
        },
        silver: {
          DEFAULT: "#BFC3C7",
          light: "#F1F2F4",
          dark: "#878C91",
        },
        bronze: {
          DEFAULT: "#B8794B",
          light: "#F7ECE4",
          dark: "#844E28",
        },
        accent: {
          DEFAULT: "#FF5C35",
          hover: "#E04823",
          light: "#FFF0EC",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "Inter", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        subtle: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        gold: "0 0 25px -5px rgba(231, 185, 60, 0.3)",
        silver: "0 0 20px -5px rgba(191, 195, 199, 0.3)",
        bronze: "0 0 20px -5px rgba(184, 121, 75, 0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
