[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/apps/marginfi-v2-ui/src/styles/globals.css)

This code is a CSS file that defines global styles for the mrgn-ts project. It sets up the basic layout and appearance of the website, including fonts, colors, and backgrounds.

The file starts by importing Tailwind CSS, a popular utility-first CSS framework. It then defines some custom utility classes using the `@layer` directive. These classes hide scrollbars on certain elements using vendor-specific CSS properties.

The `:root` selector defines some custom CSS variables that are used throughout the file. These variables define colors, gradients, and other values that are used to style various elements on the page.

The `*` selector applies some basic styles to all elements on the page, including setting the box-sizing property to border-box and removing margins and padding.

The `html` and `body` selectors set the maximum width and height of the page to 100vw and 100vh, respectively, and hide horizontal overflow. The `body` selector also sets the background color and image of the page, as well as the font family and weight.

The file then defines several `@font-face` rules that import custom fonts for the project. These fonts are used throughout the site to provide a consistent look and feel.

Overall, this file sets up the basic styles and fonts for the mrgn-ts project. It provides a starting point for more specific styles to be added in other CSS files.

Example usage:

To use the styles defined in this file, it would need to be imported into the project's main CSS file using an `@import` rule. For example:

```css
@import url("globals.css");
```

This would make the styles defined in `globals.css` available to all elements on the page. Specific styles could then be added or overridden in other CSS files as needed.

## Questions:

1.  What is the purpose of the `globals.css` file and why is it being left as is?

The purpose of the `globals.css` file is not explicitly stated, but it is being left as is because it is clean and provides ample room to scale the experience.

2. What is the purpose of the `:root` selector and what are the variables being defined within it?

   The `:root` selector is used to define global CSS variables. The variables being defined within it include values for primary and secondary glows, tile start and end RGB values, callout and card RGB and border RGB values, and the maximum width of the content.

3. What fonts are being used in this project and how are they being loaded?

   The project is using the Aeonik Pro and IBM Plex Sans and Mono fonts. They are being loaded using the `@font-face` rule, which specifies the font family, source URL, font weight, and font style for each font.
