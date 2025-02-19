module.exports = {
  root: true,
  extends: ["next", "prettier"], // Next.js + Prettier
  plugins: ["turbo"],
  rules: {
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  settings: {
    next: {
      rootDir: ["apps/marginfi-v2-ui/", "apps/marginfi-v2-trading/"],
    },
  },
};
