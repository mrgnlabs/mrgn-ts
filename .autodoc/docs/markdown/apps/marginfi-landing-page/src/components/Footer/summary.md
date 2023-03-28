[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-landing-page/src/components/Footer)

The `Footer` folder in the `mrgn-ts` project contains several files that define a React functional component called `Footer`. The `Footer` component renders a fixed navigation bar at the bottom of the screen, which consists of three sections: the left section contains links to the MarginFi documentation, analytics, and GitHub pages; the middle section contains a single link to the MarginFi decentralized lending and borrowing protocol; and the right section contains links to the MarginFi Twitter and Telegram pages, as well as a disabled link to the MRGN, Inc. website.

The `Footer.tsx` file defines the `Footer` component using the `Link` component from the Next.js framework, which allows for client-side navigation without a full page refresh. Each link is wrapped in a `NavbarCenterItem` component, which is not defined in this file but is presumably imported from another module. The `NavbarCenterItem` component renders a styled button with the text of the link.

The `Footer.module.css` file defines the styling for two buttons: `.wallet-button` and `.airdrop-button`. These buttons are likely used in the user interface of the mrgn-ts project.

The `NavbarCenterItem.tsx` file defines a reusable button component called `NavbarCenterItem` that can be customized with different text, formatting, and click actions. This component can be used in a larger project as a center item in a navigation bar that links to a specific page or performs a specific action when clicked.

The `index.tsx` file exports the `Footer` component from the `Footer.ts` file, making it available for use in other parts of the project. By exporting the `Footer` component, other files in the project can import and use it.

Overall, the `Footer` component plays an important role in the larger project by providing consistent navigation across the site. It can be imported and used in other components to ensure that the navigation bar is consistent across the entire application. Here is an example of how the `Footer` component can be used in a `HomePage` component:

```jsx
import React from "react";
import { Footer } from "./path/to/Footer";

const HomePage = () => {
  return (
    <div>
      <h1>Welcome to the HomePage</h1>
      <p>This is the content of the HomePage</p>
      <Footer />
    </div>
  );
};

export default HomePage;
```

In this example, the `HomePage` component imports the `Footer` component from the `Footer.ts` file and renders it at the bottom of the page. This ensures that the navigation bar is consistent across all pages of the application.
