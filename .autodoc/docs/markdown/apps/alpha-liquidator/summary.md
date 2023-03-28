[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/alpha-liquidator)

The `pm2.config.js` file in the `.autodoc/docs/json/apps/alpha-liquidator/scripts` folder is used to define the processes that will be run in the mrgn-ts project. The file exports an array of two objects, each representing a process to be run. The first object is named "fetcher" and specifies that the script to be run is located at "../dist/rpcFetcher.js". The "instances" property is set to 1, meaning that only one instance of this process will be run. The "exec_mode" property is set to "fork", which means that the process will be forked from the main Node.js process. The second object is named "liquidator" and specifies that the script to be run is located at "../dist/runLiquidator.js". The "wait_ready" property is set to false, which means that the process will not wait for a "ready" event before starting. The "listen_timeout" property is set to 5000, which means that the process will wait for 5 seconds for a "listen" event before timing out. The "env_development" property is an object that sets an environment variable named "IS_DEV" to "true".

To use this code in the larger mrgn-ts project, the `processes` array can be imported from the file containing the code we are documenting. The "fetcher" and "liquidator" processes can be started using the Node.js "child_process" module's "fork" method, passing in the script path from each object in the "processes" array. Event listeners can be set up to handle messages from each process. For example:

```
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

By defining these processes in this way, the project can easily manage and scale the number of instances of each process that are running. For example, if the project needs to handle more RPC requests, it can increase the number of instances of the "fetcher" process. Similarly, if the project needs to liquidate positions more quickly, it can increase the number of instances of the "liquidator" process.

Overall, the `pm2.config.js` file is an important part of the mrgn-ts project as it defines the processes that are responsible for fetching data and liquidating positions. By defining these processes in this way, the project can easily manage and scale the number of instances of each process that are running. Developers can modify this file to add or remove processes, or to change the settings for each process.
