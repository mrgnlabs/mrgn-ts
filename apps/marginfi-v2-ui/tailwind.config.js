/** @type {import("tailwindcss").Config} */

const plugin = require("tailwindcss/plugin");

module.exports = {
  important: true,
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "../../packages/mrgn-ui/src/**/*.{js,ts,jsx,tsx}",
    "../../packages/mrgn-utils/src/**/*.{js,ts,jsx,tsx}",
    "!../../packages/mrgn-ui/node_modules/**/*", // Exclude node_modules
    "!../../packages/mrgn-utils/node_modules/**/*", // Exclude node_modules
    "../../packages/mrgn-toasts/src/**/*.{js,ts,jsx,tsx}",
    "!../../packages/mrgn-toasts/node_modules/**/*", // Exclude node_modules
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "jup-gradient-colors": "linear-gradient(to right, #A0F0F8, #EEAC55)",
        "mayan-gradient-colors": "linear-gradient(90deg, #5768BD 0.11%, #FFFFFF 100%)",
      },
      borderImage: {
        SOL: "linear-gradient(to top right, #9945FF, #19FB9B)",
        USDC: "linear-gradient(to top right, #3868AB, #FFFFFF)",
        mSOL: "linear-gradient(to top right, #3D797D, #C3E6DD)",
        BONK: "linear-gradient(to top right, #E18124, #FEF093)",
        USDT: "linear-gradient(to top right, #5DA68C, #FFFFFF)",
        ETH: "linear-gradient(to top right, #151515, #FFFFFF)",
        WBTC: "linear-gradient(to top right, #E58C2C, #FFFFFF)",
        JitoSOL: "linear-gradient(to top right, #659C7B, #FFFFFF)",
        UXD: "linear-gradient(to top right, #60746E, #FFFFFF)",
        HNT: "linear-gradient(to top right, #474DFF, #FFFFFF)",
        stSOL: "linear-gradient(to top right, #11B5FF, #FFFFFF)",
      },
      colors: {
        "usd-equiv": "rgba(113, 119, 126, 0.3)",
        "btn-light": "rgb(227, 227, 227)",
        success: "hsl(var(--mrgn-success))",
        warning: "hsl(var(--mrgn-warning))",
        error: "hsl(var(--mrgn-error))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-gray": "hsl(204 13% 10%)",
        "background-gray-hover": "hsl(197 11% 16%)",
        "background-gray-light": "hsl(197 11% 16%)",
        "background-gray-dark": "hsl(180 5% 4%)",
        foreground: "hsl(var(--foreground))",
        chartreuse: "#DCE85D",
        mrgn: {
          success: "hsl(var(--mrgn-success))",
          warning: "hsl(var(--mrgn-warning))",
          error: "hsl(var(--mrgn-error))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        alert: {
          DEFAULT: "hsl(35 14% 12%)",
          foreground: "hsl(33 96% 61%)",
        },
        info: {
          DEFAULT: "hsl(218 27% 12%)",
          foreground: "hsl(220 95% 75%)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          highlight: "hsl(var(--muted-highlight))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          secondary: "hsl(var(--accent-secondary))",
          highlight: "hsl(var(--accent-highlight))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        mfi: {
          "action-box": {
            background: "hsl(var(--mfi-action-box-background))",
            "background-dark": "hsl(var(--mfi-action-box-background-dark))",
            foreground: "hsl(var(--mfi-action-box-foreground))",
            accent: "hsl(var(--mfi-action-box-accent))",
            "accent-foreground": "hsl(var(--mfi-action-box-accent-foreground))",
            highlight: "hsl(var(--mfi-action-box-highlight))",
          },
          toast: {
            background: "hsl(var(--mfi-toast-background))",
          },
          emode: "hsl(var(--mfi-emode))",
        },
      },
      screens: {
        xs: "25rem",
        tall: { raw: "(min-height: 800px)" },
      },
      maxWidth: {
        "8xl": "90rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        spin: {
          "100%": {
            transform: "rotate(360deg)",
          },
        },
        pulsate: {
          "0%, 100%": {
            opacity: 1,
          },
          "50%": {
            opacity: 0.5,
          },
        },
        "pulsate-faded": {
          "0%, 100%": {
            opacity: 0.5,
          },
          "50%": {
            opacity: 0.2,
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        spin: "spin 1s linear infinite",
        pulsate: "pulsate 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulsate-faded": "pulsate-faded 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
    fontFamily: {
      aeonik: ['"Aeonik Pro"'],
      mono: [
        "ui-monospace",
        "SFMono-Regular",
        "Menlo",
        "Monaco",
        "Consolas",
        "Liberation Mono",
        "Courier New",
        "monospace",
      ],
    },
    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1454px",
      "2xl": "1536px",
    },
  },
  plugins: [
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".invisible-scroll": {
          "content-visibility": "auto",
        },
      });
    }),
    require("tailwindcss-animate"),
    require("@tailwindcss/typography"),
  ],
};
