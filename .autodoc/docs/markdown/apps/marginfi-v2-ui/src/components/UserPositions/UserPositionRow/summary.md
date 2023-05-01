[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-v2-ui/src/components/UserPositions/UserPositionRow)

The `UserPositionRow` component in the `UserPositionRow.tsx` file is a React functional component that renders a table row for a user's position in a lending or borrowing market. It takes in three props: `activeBankInfo`, `marginfiAccount`, and `reloadPositions`. The component uses the `MarginfiAccount` class from the `@mrgnlabs/marginfi-client-v2` package to interact with the Marginfi API and displays messages using the `toast` function from the `react-toastify` package. The component provides a user interface for withdrawing or repaying tokens in a lending or borrowing market.

The `UserPositionRowAction` component in the `UserPositionRowAction.tsx` file is a React component that renders a button with customizable props. It can be used in a larger project to render buttons with consistent styling and behavior.

The `UserPositionRowHeader` component in the `UserPositionRowHeader.tsx` file is a React functional component that renders a table cell containing an asset name and an optional icon. It is likely used in a larger project to render a table row header for a user's position in relation to an asset.

The `UserPositionRowInputBox` component in the `UserPositionRowInputBox.tsx` file is a React functional component that renders a text input box with some additional features, such as a maximum value and a "max" button. It can be used to input numeric values with some additional features.

The `index.tsx` file exports the `UserPositionRow` class from the `UserPositionRow.ts` file, which can be used to render a row in a table or list of user positions.

These components may be used together in a larger project to build a user interface for managing positions in a lending or borrowing market. For example, the `UserPositionRow` component may be used in a `UserPositionsTable` component to render a table of user positions, with each row containing a `UserPositionRowHeader` component and an `UserPositionRowInputBox` component for withdrawing or repaying tokens. The `UserPositionRowAction` component may be used to render buttons for withdrawing or repaying tokens in the `UserPositionRow` component.

Here is an example of how these components may be used together:

```
import { UserPositionRow, UserPositionRowHeader, UserPositionRowInputBox, UserPositionRowAction } from 'mrgn-ts';

const UserPositionsTable = ({ userPositions }) => {
  return (
    <table>
      <thead>
        <tr>
          <th>Asset</th>
          <th>Amount</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {userPositions.map((userPosition) => (
          <tr key={userPosition.id}>
            <UserPositionRowHeader assetName={userPosition.assetName} icon={userPosition.iconUrl} />
            <td>
              <UserPositionRowInputBox
                value={userPosition.amount}
                setValue={(newValue) => console.log(`New value: ${newValue}`)}
                maxValue={userPosition.maxAmount}
                maxDecimals={userPosition.maxDecimals}
              />
            </td>
            <td>
              <UserPositionRowAction onClick={() => console.log('Withdraw clicked')}>
                Withdraw
              </UserPositionRowAction>
              <UserPositionRowAction onClick={() => console.log('Repay clicked')}>
                Repay
              </UserPositionRowAction>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
```

In this example, the `UserPositionsTable` component takes an array of `userPositions` as a prop and maps over them to render a table row for each user position. The `UserPositionRowHeader` component is used to render the header cell for each row, passing in the asset name and icon URL from the current user position object. The `UserPositionRowInputBox` component is used to render the input box for the amount of tokens, with the current amount, maximum amount, and maximum decimals passed in as props. The `UserPositionRowAction` component is used to render buttons for withdrawing or repaying tokens, with the appropriate click handlers passed in as props.
