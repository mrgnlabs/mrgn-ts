[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-landing-page/src/styles)

## `globals.css`

`globals.css` is a CSS file that defines global styles for the mrgn-ts project. It sets up the basic layout and typography for the project, as well as defining some custom colors and gradients.

The file starts by importing Tailwind CSS, a popular utility-first CSS framework. It then defines some custom utility classes using the `@layer` directive, which allows for organizing styles into logical groups. In this case, the utility classes hide scrollbars on certain elements.

The `:root` selector defines some custom CSS variables that can be used throughout the project. These variables define colors, gradients, and other values that are used in various places in the project.

The `*` selector sets some basic styles for all elements, including box-sizing, padding, and margin. The `html` and `body` selectors set the maximum width and height of the page, as well as hiding horizontal overflow. The `body` selector also sets the background color and image, font family, and font weight.

The file then defines several `@font-face` rules that import custom fonts for the project. These fonts are from the Aeonik Pro and IBM Plex families, and are available in various weights and styles.

Overall, this file sets up the basic styles and typography for the mrgn-ts project, as well as defining some custom colors and fonts. It can be used as a starting point for building out the rest of the project's styles. For example, a component might use the custom colors defined in this file to create a consistent look and feel across the project. Here's an example of how a component might use the custom colors:

```css
.my-component {
  background: linear-gradient(
    to bottom right,
    var(--tile-start-rgb),
    var(--tile-end-rgb)
  );
  border: var(--tile-border);
}
```

In this example, the `background` and `border` properties use the custom colors defined in the `:root` selector to create a consistent look for the component.

This file is an important part of the mrgn-ts project as it sets up the basic styles and typography for the entire project. It defines custom colors, fonts, and utility classes that can be used throughout the project to maintain consistency. Other parts of the project can build on top of this file to create more specific styles for individual components or pages. For example, a page might use the custom colors defined in this file to create a consistent color scheme, while a component might use the custom fonts to create a specific typographic style. Overall, `globals.css` is a foundational piece of the mrgn-ts project's styling system.
