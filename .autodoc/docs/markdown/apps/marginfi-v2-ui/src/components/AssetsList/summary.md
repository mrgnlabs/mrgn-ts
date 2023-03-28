[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-v2-ui/src/components/AssetsList)

The `AssetsList` folder in the `mrgn-ts` project contains several files and subfolders that provide components and functionality for managing financial assets on the Solana blockchain. The main file in this folder is `AssetsList.tsx`, which defines a React functional component that renders a list of assets and allows the user to switch between borrowing and lending modes.

The `AssetsList` component imports several hooks and components from external libraries and other files in the project to retrieve data from the Solana blockchain and the user's wallet. It renders a `BorrowLendToggle` component that allows the user to switch between borrowing and lending modes, and a `Table` component that renders a list of `AssetRow` components, one for each asset in the user's account.

The `AssetRow` subfolder contains several components that can be used to render and interact with individual assets in the `AssetsList` component. These components include `AssetRowHeader`, `AssetRowMetric`, `AssetRowInputBox`, and `AssetRowAction`. The `AssetRowAction` component is a reusable component that can be used throughout the project to render buttons that interact with a Solana wallet.

The `index.ts` file in the `AssetsList` folder exports the `AssetsList` class, which can be used in other parts of the project to create and manage lists of assets. For example, it could be used to create a list of assets needed for a game or to display a list of financial assets in a trading application.

Here is an example of how the `BorrowLendToggle` component could be used in a larger project:

```
import { BorrowLendToggle } from 'mrgn-ts';

function MyComponent() {
  const [isInLendingMode, setIsInLendingMode] = useState(false);

  return (
    <div>
      <BorrowLendToggle isInLendingMode={isInLendingMode} setIsInLendingMode={setIsInLendingMode} />
    </div>
  );
}
```

In this example, the `BorrowLendToggle` component is imported from the `mrgn-ts` project and used in a React functional component called `MyComponent`. The `isInLendingMode` state variable and `setIsInLendingMode` function are passed as props to the `BorrowLendToggle` component, which allows the user to switch between borrowing and lending modes.

Overall, the `AssetsList` folder provides a set of components and functionality for managing financial assets on the Solana blockchain. These components can be used in various parts of the larger `mrgn-ts` project to create a complete user experience for managing assets.
