[View code on GitHub](https://github.com/mrgnlabs/mrgn-ts/packages/lip-client/src/utils.ts)

The code in this file provides functions for calculating interest rates and guaranteed APY (Annual Percentage Yield) for a given campaign. The file imports the Campaign class from the `account` module, the `nativeToUi` function from the `mrgn-common` module, the `BN` class from the `bn.js` module, and the Bank class from the `marginfi-client-v2` module.

The `calculateInterestFromApy` function takes in the principal amount, duration in years, and APY as parameters and returns the calculated interest. The `calculateApyFromInterest` function takes in the principal amount, duration in years, and interest as parameters and returns the calculated APY. These functions can be used to calculate interest and APY for any given principal amount, duration, and APY.

The `computeGuaranteedApyForCampaign` function takes in a Campaign object as a parameter and returns the guaranteed APY for that campaign. It calls the `computeGuaranteedApy` function with the lockup period, maximum deposits, maximum rewards, and bank information from the Campaign object. The `computeGuaranteedApy` function calculates the principal, duration in years, and interest from the given parameters and calls the `calculateApyFromInterest` function to return the guaranteed APY.

Overall, this code provides useful functions for calculating interest rates and guaranteed APY for a given campaign. These functions can be used in other parts of the mrgn-ts project to calculate interest and APY for different campaigns and scenarios. For example, the `computeGuaranteedApyForCampaign` function can be used to display the guaranteed APY for a specific campaign on a user interface.
## Questions: 
 1. What is the purpose of the `mrgn-ts` project?
- As a code documentation expert, I do not have enough information to answer this question. The code provided is just a small part of the project and does not give any indication of the overall purpose of the project.

2. What is the `nativeToUi` function from the `@mrgnlabs/mrgn-common` library used for?
- The `nativeToUi` function is used to convert a value from its native representation to its user interface representation, using the `mintDecimals` property of the `bank` object.

3. What does the `computeGuaranteedApyForCampaign` function do?
- The `computeGuaranteedApyForCampaign` function calculates the guaranteed APY (Annual Percentage Yield) for a given campaign by calling the `computeGuaranteedApy` function with the appropriate parameters.