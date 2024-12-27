export type GroupPositionInfo = "LP" | "LONG" | "SHORT" | null;

export const mfiAddresses = [
  "mfi1dtjy2mJ9J21UoaQ5dsRnbcg4MBU1CTacVyBp1HF",
  "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  "9bzQQGkii8DKyZ3WQZt8WTW2zXgNkYuNwMj8agqpd3Lu",
];

// export function getGroupPositionInfo({ group }: { group: GroupData }): GroupPositionInfo {
//   const tokenBank = group.pool.token;
//   const quoteTokens = group.pool.quoteTokens;

//   let isLpPosition = true;
//   let hasAnyPosition = false;
//   let isLendingInAny = false;
//   let isLong = false;
//   let isShort = false;

//   if (tokenBank.isActive && tokenBank.position) {
//     hasAnyPosition = true;
//     if (tokenBank.position.isLending) {
//       isLendingInAny = true;
//     } else if (tokenBank.position.usdValue > 0) {
//       isShort = true;
//       isLpPosition = false;
//     }
//   }

//   quoteTokens.forEach((quoteToken) => {
//     if (quoteToken.isActive && quoteToken.position) {
//       hasAnyPosition = true;
//       if (quoteToken.position.isLending) {
//         isLendingInAny = true;
//       } else if (quoteToken.position.usdValue > 0) {
//         if (tokenBank.isActive && tokenBank.position && tokenBank.position.isLending) {
//           isLong = true;
//         }
//         isLpPosition = false;
//       }
//     }
//   });

//   if (hasAnyPosition) {
//     if (isLpPosition && isLendingInAny) {
//       return "LP";
//     } else if (isLong) {
//       return "LONG";
//     } else if (isShort) {
//       return "SHORT";
//     }
//   }

//   return null;
// }
