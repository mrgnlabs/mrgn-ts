[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/packages/mrgn-common/src/accounting.ts)

The code in this file provides two functions for converting between annual percentage rate (APR) and annual percentage yield (APY). These functions are useful for financial calculations, particularly when comparing different investment options that may have different compounding frequencies.

The first function, `apyToApr`, takes an APY value (expressed as a decimal, e.g. 0.06 for 6%) and an optional compounding frequency (defaulting to the number of hours in a year) and returns the corresponding APR value. The formula used to perform this conversion is based on the assumption of compound interest, and is sourced from a blog post linked in the code comments.

The second function, `aprToApy`, takes an APR value (also expressed as a decimal) and an optional compounding frequency (again defaulting to the number of hours in a year) and returns the corresponding APY value. This formula is also based on compound interest and is sourced from the same blog post.

Both functions use the same compounding frequency parameter, which allows for flexibility in the calculations. For example, if an investment compounds monthly instead of annually, the compounding frequency can be set to 12 to get more accurate results.

Here is an example usage of these functions:

```
import { apyToApr, aprToApy } from 'mrgn-ts';

const apy = 0.06;
const apr = apyToApr(apy); // 0.0582
const newApy = aprToApy(apr); // 0.06
```

In this example, we start with an APY value of 6% and use `apyToApr` to convert it to an APR value of 5.82%. We then use `aprToApy` to convert the APR value back to an APY value of 6%, demonstrating that the functions are inverses of each other.

## Questions:

1.  What is the purpose of this code?

- This code provides functions for converting between annual percentage yield (APY) and annual percentage rate (APR) based on a given compounding frequency.

2. What is the source of the formulas used in these functions?

- The formulas used in these functions are sourced from http://www.linked8.com/blog/158-apy-to-apr-and-apr-to-apy-calculation-methodologies.

3. What is the default value for the `compoundingFrequency` parameter in these functions?

- The default value for the `compoundingFrequency` parameter is `HOURS_PER_YEAR`, which is a constant defined as 365.25 \* 24.
