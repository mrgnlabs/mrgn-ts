[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps)

The `.autodoc/docs/json/apps` folder contains several files and subfolders that are essential for the mrgn-ts project. One of the subfolders is `alpha-liquidator`, which contains a `pm2.config.js` file that defines the processes responsible for fetching data and liquidating positions. This file exports an array of two objects, each representing a process to be run. The first object is named "fetcher" and specifies that the script to be run is located at "../dist/rpcFetcher.js". The second object is named "liquidator" and specifies that the script to be run is located at "../dist/runLiquidator.js". By defining these processes in this way, the project can easily manage and scale the number of instances of each process that are running.

Another subfolder is `marginfi-landing-page`, which contains a `next.config.js` file that exports a configuration object that customizes the Next.js build process for the mrgn-ts project. This file transpiles specific modules, sets environment variables, configures webpack, and optimizes image loading. This allows for a more efficient and customized build process that is tailored to the needs of the project.

The `marginfi-v2-ui` subfolder contains several configuration files and folders that are essential for the mrgn-ts project. These files provide various configuration options for the project, including dynamic configuration, transpilation of specific packages, enabling strict mode, modifying the webpack configuration, and loading images from remote sources. The `next.config.js` file exports an object with various configuration options for the mrgn-ts project. The `postcss.config.js` file exports an object with two plugins, `tailwindcss` and `autoprefixer`, that enhance the functionality of the CSS preprocessor, PostCSS. The `tailwind.config.js` file exports a Tailwind CSS configuration object that can be used to customize the styling of a web application. Finally, the `tsconfig.json` file is a configuration file for the TypeScript compiler in the mrgn-ts project.

Developers can modify these files to add or remove processes, customize the build process, and customize the behavior and styling of the application. For example, developers can modify the properties in the `next.config.js` file to customize the project's configuration, use the `tailwind.config.js` file to customize the visual style of the application, and use the `tsconfig.json` file to set up the TypeScript compiler for a Next.js application.

Here is an example of how to use the `processes` array from the `pm2.config.js` file to start the "fetcher" and "liquidator" processes:

```javascript
const { fork } = require('child_process');
const { processes } = require('../path/to/pm2.config.js');

const fetcherProcess = fork(processes[0].script);
const liquidatorProcess = fork(processes[1].script);

fetcherProcess.on('message', (message) => {
  // handle message from fetcher process
});

liquidatorProcess.on('message', (message) => {
  // handle message from liquidator process
});
```

Overall, the files and subfolders in the `.autodoc/docs/json/apps` folder provide essential options and plugins for the mrgn-ts project, allowing developers to customize the behavior and styling of the application.
