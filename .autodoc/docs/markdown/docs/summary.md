[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/docs)

The `index.html` file in the `.autodoc/docs/json/docs` folder serves as documentation for the `@mrgnlabs/marginfi-client-v2` TypeScript client library. This file provides information on how to use the library, including installation instructions, available classes, interfaces, and enums, and their respective methods and properties.

The file includes a header with a search bar and a menu, a main content section with a brief description of the library, and a sidebar with links to different sections of the documentation. The sidebar includes links to the different classes, interfaces, and enums available in the library, as well as links to some utility functions.

This file is an important part of the `@mrgnlabs/marginfi-client-v2` project as it provides developers with the necessary information to use the library effectively. Developers can use this file to learn about the library's components and how to use them, as well as to troubleshoot any issues they may encounter.

To learn about the available classes in the library, a developer can click on the "Exports" link in the sidebar. This will take them to a page with links to each of the available classes, including `Balance`, `Bank`, `MarginfiAccount`, `MarginfiClient`, `MarginfiClientReadonly`, and `MarginfiGroup`. Clicking on any of these links will take the developer to a page with more detailed information on the class, including its properties and methods.

To learn about the available enums in the library, a developer can click on the "Exports" link in the sidebar and then click on the "AccountType", "BankVaultType", "MarginRequirementType", "OracleSetup", or "PriceBias" links. This will take them to a page with more detailed information on the enum, including its available values.

Overall, the `index.html` file serves as a comprehensive guide to the `@mrgnlabs/marginfi-client-v2` library, providing developers with the information they need to use the library effectively.

The `highlight.css` file in the `assets` folder defines CSS variables for the background color of code blocks and sets them based on the user's preferred color scheme. This allows for a consistent and accessible user interface for the mrgn-ts project.

To use this code, simply include the `highlight.css` file in the HTML file and add the appropriate classes to the `body` element to indicate the user's preferred color scheme.

For example:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Example Page</title>
  <link rel="stylesheet" href="mrgn-ts/highlight.css">
</head>
<body class="dark">
  <h1>Example Page</h1>
  <p>This is an example page for the mrgn-ts project.</p>
  <pre><code>const greeting = "Hello, world!";
console.log(greeting);</code></pre>
</body>
</html>
```

In this example, the `highlight.css` file is included in the HTML file and the `body` element has a class of `dark`, indicating that the user prefers a dark color scheme. The `pre` and `code` elements within the page will have a background color of `#1E1E1E` (the value of `--dark-code-background`).

The `enums` folder contains documentation files for various enumerations used in the `@mrgnlabs/marginfi-client-v2` package. These files provide information about the members of each enumeration, as well as their values and source locations.

For example, the `AccountType` enumeration can be used to specify the type of account or group in the Marginfi system. Developers can use this enumeration to define the type of account or group when making requests to the Marginfi API.

The `interfaces` folder contains documentation files for various interfaces in the `@mrgnlabs/marginfi-client-v2` package. These files provide information about the properties and methods of each interface, as well as how they can be used in code.

For example, the `MarginfiAccountData` interface represents account data in the Marginfi system. Developers can refer to the `MarginfiAccountData.html` file to understand the properties of the interface and how to use them.

Overall, these folders provide important documentation for developers who are working on the `@mrgnlabs/marginfi-client-v2` package, as they provide a comprehensive and user-friendly interface for accessing information about the project's components.
