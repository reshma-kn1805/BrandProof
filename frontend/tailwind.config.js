/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: "#EAF2F3",
          surface: "#F7FAFA",
          sidebar: "#172E35",
          teal: "#328C91",
          deepTeal: "#205E65",
          darkText: "#172C32",
          secondaryText: "#63777C",
          card: "#FFFFFF",
          border: "#DCE7E8",
          // Feedback states
          success: "#1E7E51",
          warning: "#B45309",
          critical: "#B91C1C",
          successLight: "#E8F5E9",
          warningLight: "#FEF3C7",
          criticalLight: "#FEE2E2",
        },
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "monospace"],
      },
      boxShadow: {
        subtle: "0 1px 3px 0 rgba(23, 44, 50, 0.05), 0 1px 2px 0 rgba(23, 44, 50, 0.03)",
        card: "0 2px 6px -1px rgba(23, 44, 50, 0.06), 0 1px 4px -1px rgba(23, 44, 50, 0.04)",
        elevated: "0 10px 25px -3px rgba(23, 46, 53, 0.1), 0 4px 6px -2px rgba(23, 46, 53, 0.05)",
      },
    },
  },
  plugins: [],
};

