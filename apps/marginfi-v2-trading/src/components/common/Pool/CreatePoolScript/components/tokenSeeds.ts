import { OracleSetup } from "@mrgnlabs/marginfi-client-v2";

export interface BankToken {
  tag: string;
  token: string;
  oracleType: OracleSetup;
  oracle: string;
  borrowLimit?: number;
  depositLimit?: number;
}

export const bankTokens: BankToken[] = [
  // {
  //   tag: "POPCAT",
  //   token: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
  //   oracleType: OracleSetup.SwitchboardV2,
  //   oracle: "8d45nFEBUrKAJpeRt5AND5enwP1Tq26dz6nvpNPAGBZd",
  //   borrowLimit: 32463,
  //   depositLimit: 129065,
  // },
  {
    tag: "DJT",
    token: "HRw8mqK8N3ASKFKJGMJpy4FodwR3GKvCFKPDQNqUNuEP",
    oracleType: OracleSetup.SwitchboardV2,
    oracle: "GayQym7GYT8C4z7Te37ZiqZUHRpBYotChMV5JRYJxdcQ",
    borrowLimit: 3384782,
    depositLimit: 13497098,
  },
  {
    tag: "BILLY",
    token: "3B5wuUrMEi5yATD7on46hKfej3pfmd7t1RKgrsN3pump",
    oracleType: OracleSetup.SwitchboardV2,
    oracle: "2fHyhGm1oMujhMPmm7z3pCYbyRTDmFB1CQJjM5caYT4N",
    borrowLimit: 165782,
    depositLimit: 673400,
  },
  {
    tag: "RETARDIO",
    token: "6ogzHhzdrQr9Pgv6hZ2MNze7UrzBMAFyBBWUYp1Fhitx",
    oracleType: OracleSetup.SwitchboardV2,
    oracle: "8pMJw6N3e1FDexoTMx1T1ComSB91tmQydFrmhmmnXZuV",
    borrowLimit: 320512,
    depositLimit: 1283697,
  },
];
