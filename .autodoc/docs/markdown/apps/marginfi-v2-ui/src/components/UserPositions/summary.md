[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-v2-ui/src/components/UserPositions)

The `UserPositions` folder in the `mrgn-ts` project contains code related to displaying and managing user positions in lending and borrowing markets. The main file in this folder is `UserPositions.tsx`, which exports a React functional component that renders a table of user positions. The component uses the Material-UI library and custom hooks to filter and map user positions, and conditionally renders two `Card` components for lending and borrowing positions.

The `UserPositions` component can be used in a larger project to display user positions in a clear and organized way. It can be customized by modifying the styles of the `Card`, `Table`, and `TableBody` components, and by passing additional props to the `UserPositionRow` component. For example, the `UserPositionRow` component could be modified to display additional information about each position, such as the interest rate or collateral requirements.

The `UserPositions` component relies on the `UserPositionRow` component, which is located in the `UserPositionRow` subfolder. The `UserPositionRow` component is a React functional component that renders a table row for a user's position in a lending or borrowing market. It takes in three props and uses the `MarginfiAccount` class and `react-toastify` package to interact with the Marginfi API and display messages. The `UserPositionRow` component can be used in a larger project to build a user interface for managing positions in a lending or borrowing market.

The `UserPositionRow` subfolder also contains several other components that can be used in conjunction with the `UserPositionRow` component to build a more complex user interface. For example, the `UserPositionRowHeader` component can be used to render a table row header for a user's position in relation to an asset, and the `UserPositionRowInputBox` component can be used to input numeric values with some additional features.

Overall, the code in the `UserPositions` folder provides a foundation for displaying and managing user positions in lending and borrowing markets. It can be used in a larger project to build a more complex user interface for managing positions, and can be customized by modifying the styles and passing additional props to the various components. Here is an example of how the `UserPositions` component might be used in a larger project:

```
import { UserPositions } from 'mrgn-ts';

const MyPositionsPage = () => {
  return (
    <div>
      <h1>My Positions</h1>
      <UserPositions />
    </div>
  );
};
```

In this example, the `UserPositions` component is rendered on a page called `My Positions`, providing a clear and organized view of the user's positions in lending and borrowing markets.
