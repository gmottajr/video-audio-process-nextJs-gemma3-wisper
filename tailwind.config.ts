import type { Config } from "tailwindcss";

// sRGB approximations of OKLCH values (computed via OKLAB math, for comments)
// oklch(60% 0.20 290) → #8362ed  violet
// oklch(72% 0.16  55) → #ef852e  amber
// oklch(66% 0.17 195) → #00b0b2  teal
// oklch(14% 0.02 280) → #080812  background
// oklch(24% 0.025 280)→ #141320  surface

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--bg)",
        foreground: "var(--text)",
        aura: {
          // Backgrounds (H=280 — cool-neutral, "tool-first")
          canvas:           "var(--bg)",
          surface:          "var(--surface)",
          elevated:         "var(--elevated)",
          border:           "var(--border)",
          // Accents (~120° hue separation, perceptually balanced)
          violet:           "var(--violet)",
          "violet-dim":     "var(--violet-dim)",
          amber:            "var(--amber)",
          "amber-dim":      "var(--amber-dim)",
          teal:             "var(--teal)",
          "teal-dim":       "var(--teal-dim)",
          // Typography
          text:             "var(--text)",
          "text-secondary": "var(--text-secondary)",
          muted:            "var(--text-muted)",
          // Legacy
          accent:           "var(--violet)",
          "accent-deep":    "var(--violet-dim)",
        },
      },
      fontFamily: {
        sans:          ["var(--font-dm-sans)", "var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        display:       ["var(--font-syne)", "var(--font-space-grotesk)", "ui-sans-serif", "sans-serif"],
        mono:          ["ui-monospace", "monospace"],
        tchaikovsky:   ["Tchaikovsky", "serif"],
        jazz:          ["Jazz", "serif"],
        alphamusicman: ["AlphaMusicMan", "sans-serif"],
        chaotic:       ["ChaoticCircuit", "sans-serif"],
        jazzbob:       ["Jazzbob", "sans-serif"],
      },
      backgroundImage: {
        // Violet-undertoned radial — slightly less intense than before
        "aura-radial":
          "radial-gradient(ellipse 14% 8% at 50% 0%, oklch(62% 0.18 250 / 0.12), transparent 100%)",
        // Cooler-hue grid lines
        "aura-grid":
          "linear-gradient(to right, oklch(100% 0 0 / 0.05) 1px, transparent 1px), " +
          "linear-gradient(to bottom, oklch(100% 0 0 / 0.05) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-tile": "56px 56px",
      },
    },
  },
  plugins: [],
};
export default config;
