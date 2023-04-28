[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/apps/marginfi-landing-page/src/components/Navbar/Navbar.module.css)

This code defines the styles for two different buttons: `.wallet-button` and `.airdrop-button`. These buttons are likely used in the user interface of the mrgn-ts project.

The `.wallet-button` class sets the height, width, font size, color, background color, border, padding, border radius, display, justify content, align items, font weight, and text transform properties. This results in a button with a green background color, black text, and rounded edges. The button is centered horizontally and vertically within its container.

The `.airdrop-button` class sets similar properties, but with different values. This results in a button with a transparent green background color, light gray text, and rounded edges. When the user hovers over the button, the background color becomes transparent, the text becomes white, and the border becomes white and bold.

These buttons are likely used to perform different actions within the mrgn-ts project. For example, the `.wallet-button` may be used to access a user's wallet or account information, while the `.airdrop-button` may be used to participate in an airdrop or promotional event.

Here is an example of how these buttons may be used in HTML code:

```
<button class="wallet-button">My Wallet</button>
<button class="airdrop-button">Join Airdrop</button>
```

Overall, this code defines the styles for two buttons that are likely used in the user interface of the mrgn-ts project. These buttons may be used to perform different actions within the project, and can be easily customized by adjusting the CSS properties defined in this code.

## Questions:

1.  What is the purpose of the `.wallet-button` class?

- The `.wallet-button` class is used to style a button element related to a wallet feature, with specific height, width, font size, color, background color, border, padding, border radius, and alignment properties.

2. What is the purpose of the `.airdrop-button` class?

   - The `.airdrop-button` class is used to style a button element related to an airdrop feature, with specific height, background color, color, border, padding, and border radius properties. It also has a hover effect that changes the font weight, background color, color, border, and border radius.

3. Why are some properties marked with `!important`?
   - The `!important` keyword is used to give priority to certain CSS properties over others. In this case, it is used to ensure that the specified properties are applied even if there are conflicting styles from other sources.
