[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/.autodoc/docs/json/apps/marginfi-v2-ui/src/utils)

The `formatters.ts` file in the `utils` folder of the `marginfi-v2-ui` app provides pre-configured number formatters for use throughout the larger `mrgn-ts` project. The file contains several instances of the `Intl.NumberFormat` class, which is used for formatting numbers according to a specific locale. 

The first two instances, `groupedNumberFormatter` and `groupedNumberFormatterDyn`, format numbers with grouping separators (e.g. commas) and a fixed number of decimal places. The difference between the two is that `groupedNumberFormatterDyn` allows for a variable number of decimal places, while `groupedNumberFormatter` always displays two decimal places. The `usdFormatter` instance formats numbers as US dollars with a currency symbol and a fixed number of decimal places. The `percentFormatter` and `percentFormatterDyn` instances format numbers as percentages with a fixed or variable number of decimal places. 

These formatters can be imported and used throughout the `mrgn-ts` project to ensure consistent formatting of numbers, currencies, and percentages. For example, the `usdFormatter` and `percentFormatter` might be used to display monetary values and growth rates in a standardized way. 

The `index.ts` file in the same folder contains various utility functions and types that are used in the `mrgn-ts` project. The file imports several dependencies, including `@solana/web3.js`, `superstruct`, and `@mrgnlabs/mrgn-common`, as well as a JSON file called `token_info.json` that contains metadata about various tokens. 

The file defines two utility functions, `floor` and `ceil`, which can be used throughout the project to perform math operations on token values. It also defines several types and functions related to token metadata, including `TokenMetadataRaw`, `TokenMetadataList`, `parseTokenMetadata`, `parseTokenMetadatas`, and `loadTokenMetadatas`. These functions can be used to load and parse token metadata throughout the project. 

Finally, the file defines two utility functions related to airdrops, including `FAUCET_PROGRAM_ID` and `makeAirdropCollateralIx`. These functions can be used to initiate airdrops throughout the project. 

Overall, the `utils` folder in the `marginfi-v2-ui` app provides a set of utility functions and pre-configured formatters that can be used throughout the larger `mrgn-ts` project to ensure consistent formatting and functionality. 

Here is an example of how the `floor` and `usdFormatter` functions might be used:

```
import { floor, usdFormatter } from 'mrgn-ts';

const tokenValue = 12345.6789;
const roundedValue = floor(tokenValue, 2);

console.log(usdFormatter.format(roundedValue)); // "$12,345.68"
```
