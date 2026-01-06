/* eslint-disable no-undef */
/** @type {import('tailwindcss').Config} */

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Glass System
        glass: "rgba(255, 255, 255, 0.03)",
        glassLight: "rgba(255, 255, 255, 0.06)",
        glassMedium: "rgba(255, 255, 255, 0.1)",
        glassHeavy: "rgba(255, 255, 255, 0.15)",
        glassBorder: "rgba(255, 255, 255, 0.08)",
        glassBorderLight: "rgba(255, 255, 255, 0.12)",

        // Brand Colors - Warm Palette
        primary: "#fb923c", // Orange 400 - Warm and inviting
        primaryDark: "#ea580c", // Orange 600
        primaryLight: "#fed7aa", // Orange 200

        accent: "#fbbf24", // Amber 400 - Warm accent
        accentDark: "#d97706", // Amber 600

        success: "#34d399", // Emerald 400
        danger: "#fb7185", // Rose 400
        warning: "#fbbf24", // Amber 400

        // Dark Studio Backgrounds
        darkBg: "#030712", // Gray 950 (Obsidian)
        darkBgSec: "#0b1121", // Very dark blue/gray
        darkPaper: "#1e293b", // Slate 800
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(145deg, #fb923c 0%, #fbbf24 100%)', // Orange to Amber
        'gradient-dark': 'linear-gradient(180deg, #030712 0%, #111827 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(251, 146, 60, 0.15) 0%, transparent 70%)',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.2)',
        'glow-primary': '0 0 30px -5px rgba(251, 146, 60, 0.5)',
        'glow-accent': '0 0 30px -5px rgba(251, 191, 36, 0.5)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}

