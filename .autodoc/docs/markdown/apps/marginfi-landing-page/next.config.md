[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/apps/marginfi-landing-page/next.config.js)

This code exports a Next.js configuration object that has been modified to include the `next-transpile-modules` package. This package allows for the transpilation of specific modules during the Next.js build process. In this case, the modules being transpiled are `@mrgnlabs/marginfi-client-v2`, `@mrgnlabs/mrgn-common`, and `@mrgnlabs/lip-client`.

The configuration object also includes a `publicRuntimeConfig` property that sets the `NODE_ENV` environment variable to the value of the `process.env.NODE_ENV` variable. This allows for the dynamic configuration of the application at runtime.

The `webpack` property is also included in the configuration object. It sets the `fallback` property of the `resolve` object to `{ fs: false, path: false }`. This is done to prevent webpack from trying to include the `fs` and `path` modules in the client-side bundle, as these modules are not available in the browser.

Finally, the `images` property is included in the configuration object. It sets the `remotePatterns` property to an array of objects that define remote image patterns. These patterns are used by the `next/image` component to optimize image loading and caching.

Overall, this configuration object is used to customize the Next.js build process for the `mrgn-ts` project. It transpiles specific modules, sets environment variables, configures webpack, and optimizes image loading. This allows for a more efficient and customized build process that is tailored to the needs of the project.
## Questions: 
 1. What is the purpose of the `next-transpile-modules` package and why is it being used in this code?
   - The `next-transpile-modules` package is being used to transpile specific modules during the Next.js build process. This is necessary because these modules are not natively compatible with Next.js.
2. What is the `publicRuntimeConfig` object and what is its purpose in this code?
   - The `publicRuntimeConfig` object is used to expose environment variables to the client-side code in a Next.js application. In this code, it is being used to expose the `NODE_ENV` environment variable.
3. Why is the `fallback` property being set to `{ fs: false, path: false }` in the `webpack` configuration?
   - The `fallback` property is being set to `{ fs: false, path: false }` to prevent webpack from trying to include the `fs` and `path` modules in the client-side bundle. This is because these modules are not available in the browser environment and can cause errors if included in the client-side code.