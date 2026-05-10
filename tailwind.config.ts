import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: "hsl(var(--card))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        border: "hsl(var(--border))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          soft: "hsl(var(--accent-soft))",
        },
        clay: {
          50: "#fbf7f1",
          100: "#f4eadc",
          500: "#b97349",
          700: "#824832",
          900: "#5d352b",
        },
        leaf: {
          100: "#dfeedd",
          500: "#4f8b5f",
          700: "#32623f",
        },
        saffron: {
          100: "#fff1cb",
          500: "#e99f2f",
          700: "#a96511",
        },
      },
      boxShadow: {
        card: "0 18px 50px -34px rgba(92, 54, 30, 0.55)",
      },
      borderRadius: {
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};
export default config;
