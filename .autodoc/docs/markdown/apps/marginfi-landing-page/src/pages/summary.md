[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-landing-page/src/pages)

The `pages` folder in `.autodoc/docs/json/apps/marginfi-landing-page/src` contains the React components that define the pages of the Marginfi web application.

The `_app.tsx` file sets up the basic structure of the application by defining the `MyApp` component, which takes two props: `Component` and `pageProps`. The `Component` prop is a reference to the current page being rendered by Next.js, and the `pageProps` prop is an object that contains additional props that can be passed to the page component. The `MyApp` component renders a `Head` component with metadata, a `Navbar` component, a `div` with the `Component` prop, and a `Footer` component. The `useEffect` hook is used to initialize Matomo for analytics tracking. This code can be used as a starting point for building out the rest of the application's pages and components.

The `_document.tsx` file defines the HTML document structure for the Next.js application. It exports a default function called `Document` that returns a JSX element representing the HTML document. The `Html` component defines the root element of the HTML document, the `Head` component defines the head section of the HTML document, and the `body` element defines the body section of the HTML document. The `Main` component defines the main content of the page, and the `NextScript` component includes the necessary scripts for the page to function properly. This component is used by Next.js to generate the HTML document for each page of the application.

The `index.tsx` file defines the home page of the Marginfi web application. It imports several modules from external libraries, including React, Next.js, and Material UI. The `Image` component from Next.js is used to display the hero image, while the `Button` component from Material UI is used to render the "Launch App" button. The `Home` component returns a JSX expression that contains two `div` elements. The first `div` element displays the hero image using the `Image` component, and the second `div` element displays the tagline and the "Launch App" button. This code can be used as a starting point for the home page of the Marginfi web application.

Overall, the `pages` folder contains the React components that define the pages of the Marginfi web application. Developers can modify these components to fit the specific requirements of the project and customize their appearance using CSS and external libraries. For example, they can add new pages, modify the existing pages, or create reusable components that can be used across multiple pages.

Example usage:

```jsx
import MyApp from "~/components/MyApp";
import HomePage from "~/pages/Home";

const App = () => {
  return <MyApp Component={HomePage} pageProps={{}} />;
};

export default App;
```
