[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/docs/enums)

The `enums` folder in the `docs` directory of the `mrgn-ts` project contains several HTML files that serve as documentation for different enumerations used in the `@mrgnlabs/marginfi-client-v2` package. These enumerations are used to define different types of accounts, groups, vaults, and biases in the Marginfi system.

Each HTML file provides a clear and organized overview of the different members of the enumeration, as well as their values and source locations. The files also include search bars, navigation menus, and legends that help developers find the information they need quickly and understand the different icons used in the documentation.

For example, the `AccountType.html` file provides documentation for the `AccountType` enumeration, which is used to specify the type of account or group in the Marginfi system. Developers can use this enumeration to define the type of account or group when making requests to the Marginfi API. Here is an example of how the `AccountType` enumeration can be used in the project:

```typescript
import { AccountType } from '@mrgnlabs/marginfi-client-v2';

const accountType = AccountType.MarginfiAccount;
```

In this example, the `AccountType` enumeration is imported from the `@mrgnlabs/marginfi-client-v2` package. The `MarginfiAccount` member is then assigned to the `accountType` variable.

Similarly, the `BankVaultType.html` file provides documentation for the `BankVaultType` enumeration, which is used to define different types of vaults in the Marginfi system. The `MarginRequirementType.html` file provides documentation for the `MarginRequirementType` enumeration, which is used to define different types of margin requirements for accounts in the Marginfi system. The `OracleSetup.html` file provides documentation for the `OracleSetup` enumeration, which is used to represent different types of oracles in the Marginfi system. Finally, the `PriceBias.html` file provides documentation for the `PriceBias` enumeration, which is used to define different types of price biases in the Marginfi system.

Overall, the `enums` folder in the `docs` directory of the `mrgn-ts` project provides important documentation for developers who are working with the `@mrgnlabs/marginfi-client-v2` package. These HTML files provide clear and concise information about the different enumerations used in the package, as well as their members and values. Developers can use this information to write better code and avoid errors when working with the enumerations.
