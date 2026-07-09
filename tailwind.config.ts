import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Fraunces"', "ui-serif", "Georgia", "serif"],
        serif: ['"Newsreader"', "ui-serif", "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      colors: {
        // Inkwell dark theme — paper is the dark ground, ink is the cream foreground
        paper: {
          DEFAULT: "#100d0a",
          warm: "#1a1612",
          cool: "#15110d",
        },
        ink: {
          DEFAULT: "#f3eada",
          soft: "#e2d7be",
          mid: "#b8ac90",
          dim: "#948869",
        },
        terra: {
          DEFAULT: "#e2683a",
          deep: "#b94f24",
        },
        forest: {
          DEFAULT: "#9ab86a",
          deep: "#6f8a48",
        },
        ochre: {
          DEFAULT: "#e5b542",
          deep: "#a87f1f",
        },
        slate: {
          DEFAULT: "#8a9eb3",
        },
      },
      letterSpacing: {
        "ultra-tight": "-0.04em",
      },
    },
  },
  plugins: [],
} satisfies Config;
