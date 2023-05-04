/** @type {import("tailwindcss").Config} */

const plugin = require("tailwindcss/plugin");

module.exports = {
  important: true,
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-colors": "linear-gradient(to right, #A0F0F8, #EEAC55)",
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
      },
      colors: {
        "usd-equiv": "rgba(113, 119, 126, 0.3)",
        "btn-light": "rgb(227, 227, 227)",
      },
    },
    fontFamily: {
      aeonik: ['"Aeonik Pro"'],
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
