/** @type {import("tailwindcss").Config} */

const plugin = require("tailwindcss/plugin");

module.exports = {
  important: true,
  content: ["./src/pages/**/*.{js,ts,jsx,tsx}", "./src/components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
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
