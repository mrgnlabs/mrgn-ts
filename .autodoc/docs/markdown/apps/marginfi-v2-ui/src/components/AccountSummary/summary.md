[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-v2-ui/src/components/AccountSummary)

The `AccountSummary` folder in the `mrgn-ts` project contains several React components that are used to display account information to users.

The `AccountBalance` component displays the user's account balance, while the `MobileHealth` component displays the health factor of the account. The `AccountMetric` component is a flexible component that can be used to display various metrics or data points in a stylized manner. The `HealthMonitor` component provides a slider and tooltip for displaying the health factor of a portfolio, while the `index.tsx` file exports the `AccountSummary` class for use in other parts of the project.

These components can be used in a larger React application to provide users with a clear and concise summary of their account information. For example, the `AccountSummary` component could be used in a `Dashboard` component to display a user's account information.

```typescript
import React from "react";
import { AccountSummary } from "mrgn-ts";

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Account Summary</h1>
      <AccountSummary />
    </div>
  );
};

export default Dashboard;
```

Overall, the `AccountSummary` folder provides a set of reusable components that can be used to display account information in a consistent and stylized manner. The components are designed to be flexible and adaptable to different contexts, and can be used in a variety of financial applications.
