// .eslintrc.js
module.exports = {
  root: true,
  extends: [
    "next",    // Next.js recommended rules
    "turbo",   // Turbo repo rules (if applicable)
    "prettier" // Disable ESLint rules that might conflict with Prettier
  ],
  rules: {
    // Keep your previous customizations
    "@next/next/no-html-link-for-pages": "off",
    "react/jsx-key": "off",
    "react-hooks/rules-of-hooks": "error",
    "react-hooks/exhaustive-deps": "warn",
  },
  settings: {
    // This ensures that ESLint knows where your Next.js apps live
    next: {
      rootDir: ["apps/*/"],
    },
  },
};
