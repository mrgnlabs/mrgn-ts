/** @type {import("tailwindcss").Config} */

const plugin = require("tailwindcss/plugin");

module.exports = {
  important: true,
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
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
        success: "#75ba80",
        warning: "#daa204",
        error: "#e07d6f",
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
  ],
};
