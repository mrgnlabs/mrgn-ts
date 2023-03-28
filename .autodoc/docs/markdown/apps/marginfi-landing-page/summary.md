[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-landing-page)

The `next.config.js` file in `.autodoc/docs/json/apps/marginfi-landing-page` exports a configuration object that customizes the Next.js build process for the `mrgn-ts` project. It transpiles specific modules, sets environment variables, configures webpack, and optimizes image loading. This allows for a more efficient and customized build process that is tailored to the needs of the project.

For example, the `next-transpile-modules` package is used to transpile specific modules during the Next.js build process. The `publicRuntimeConfig` property sets the `NODE_ENV` environment variable to the value of the `process.env.NODE_ENV` variable, allowing for dynamic configuration of the application at runtime. The `webpack` property configures webpack to prevent it from trying to include the `fs` and `path` modules in the client-side bundle, and the `images` property optimizes image loading and caching.

This configuration object can be used in the larger project's build process to ensure that the application is built efficiently and with the necessary customizations. For example, in a `package.json` file, the configuration object can be included in the `nextConfig` field:

```
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^11.1.2",
    "react": "^17.0.2",
    "react-dom": "^17.0.2",
    "next-transpile-modules": "^8.0.0"
  },
  "nextConfig": {
    "webpack": {
      "fallback": {
        "fs": false,
        "path": false
      }
    },
    "images": {
      "remotePatterns": [
        {
          "type": "https",
          "pattern": "https://example.com/images/*"
        }
      ]
    },
    "publicRuntimeConfig": {
      "NODE_ENV": process.env.NODE_ENV
    },
    "transpileModules": [
      "@mrgnlabs/marginfi-client-v2",
      "@mrgnlabs/mrgn-common",
      "@mrgnlabs/lip-client"
    ]
  }
}
```

This configuration object can be used to customize the build process for the `mrgn-ts` project, ensuring that it is efficient and tailored to the project's needs.
