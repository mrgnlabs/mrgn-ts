import type { NextApiRequest, NextApiResponse } from "next";
import NextCors from "nextjs-cors";
import { callAI } from "~/api/ai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { BigQuery } from "@google-cloud/bigquery";
import path from "path";
import fs from "fs";

type Action = "deposit" | "borrow" | "stake" | "unstake" | null;
type Token = "USDC" | "SOL" | "mSOL" | "BONK" | "USDT" | "ETH" | "WBTC" | "JitoSOL" | "UXD" | "HNT" | "stSOL" | null;

interface ExtractVariablesOutput {
  action: Action;
  amount: number | null;
  token: Token;
}

const extractVariables = (sentence: string): ExtractVariablesOutput => {
  const actionRegex =
    /(lend|deposit|withdraw|borrow|repay|stake|unstake|superstake|unsuperstake|add|put|give|bring|submit|provide|contribute|take|get|withdrawal|retrieve|repayment|return|earn|gain|collect|dump|stuff|yank|stash|grab|cash-in|cash-out|bounce|withdraw-inate|deposit-ify|plunk|squirrel|park|nest-egg|sock-away|hoard|tuck-away|take out)/i;
  const amountRegex = /(\d+(?:\.\d+)?)/;
  const tokenRegex = /(USDC|SOL|mSOL|BONK|USDT|ETH|WBTC|JITOSOL|UXD|HNT|STSOL)/i;

  const actionMatch = sentence.match(actionRegex);
  const amountMatch = sentence.match(amountRegex);
  const tokenMatch = sentence.match(tokenRegex);

  let action: Action = actionMatch ? (actionMatch[0].toLowerCase() as Action) : null;
  const amount: number | null = amountMatch ? parseFloat(amountMatch[0]) : null;
  const token: Token = tokenMatch ? (tokenMatch[0].toUpperCase() as Token) : null;

  if (action !== null) {
    if (
      [
        "lend",
        "repay",
        "add",
        "put",
        "give",
        "bring",
        "submit",
        "provide",
        "contribute",
        "deposit-ify",
        "plunk",
        "squirrel",
        "park",
        "nest-egg",
        "sock-away",
        "hoard",
        "tuck-away",
      ].includes(action)
    ) {
      action = "deposit";
    } else if (
      [
        "withdraw",
        "pull",
        "take",
        "get",
        "withdrawal",
        "retrieve",
        "repayment",
        "return",
        "dump",
        "stuff",
        "yank",
        "stash",
        "grab",
        "cash-in",
        "cash-out",
        "bounce",
        "withdraw-inate",
        "take out",
      ].includes(action)
    ) {
      action = "borrow";
    } else if (["superstake", "earn"].includes(action)) {
      action = "stake";
    } else if (["unsuperstake"].includes(action)) {
      action = "unstake";
    }
  }

  if (action !== null && !["deposit", "borrow", "stake", "unstake"].includes(action)) {
    action = null;
  }

  return {
    action,
    amount,
    token,
  };
};

// Get random action in case of error
const getRandomAction = (): string => {
  const actions = [
    "organizing a Solana Monkey Business conga line on Tensor",
    "hosting a Degenerate Ape Academy vs Claynosaurz dance-off at Magic Eden",
    "creating an oogy pods racing league with Famous Fox Federation as cheerleaders",
    "producing a sitcom where Wolf Capital and Transdimensional Fox Federation are rival roommates",
    "staging a grand Okay Bears parade through the streets of the virtual Magic Eden marketplace",
    "launching LILY, a virtual cooking show hosted by Ovols in collaboration with DeGods",
    "inviting Apes and Milady to participate in an online karaoke contest streamed on Tensor",
    "hosting an ABC costume party on Magic Eden with celebrity guest judges",
    "creating a Solana Monkey Business synchronized swimming performance art piece on Tensor",
    "hosting an underwater clay sculpting competition between Claynosaurz and DeGods",
    "organizing a Famous Fox Federation and Wolf Capital virtual scavenger hunt on Magic Eden",
    "producing a reality show where Okay Bears and LILY compete in extreme sports on Tensor",
    "organizing an Ovols and Apes poetry slam, featuring verses inspired by their NFT collections",
    "hosting a Milady and Solana Monkey Business fashion show with DeGods as runway models",
    "inviting Claynosaurz and oogy pods to a virtual potluck dinner party on Tensor",
    "organizing an ABC and Transdimensional Fox Federation talent show on Magic Eden",
    "staging a mock trial with Ovols as judges and Wolf Capital as the jury",
    "hosting a virtual game night on Tensor, where DeGods and Milady compete in classic board games",
    "producing a rom-com where an Okay Bear falls in love with a member of the Famous Fox Federation",
    "hosting an online Solana-based trivia night, where each NFT collection forms a team and competes on Magic Eden",
  ];

  const randomIndex = Math.floor(Math.random() * actions.length);
  return actions[randomIndex];
};

const getApologyMessage = (): string => {
  const randomAction = getRandomAction();
  return `Sorry, I got caught ${randomAction}. Try again.`;
};

function findVM(input: string): string | null {
  const regex = /vm/i;
  const result = input.match(regex);
  return result ? result[0] : null;
}

const rateLimiter = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(50, "3h") });

async function rateLimiterMiddleware(req: NextApiRequest, res: NextApiResponse) {
  const ip = req.headers["x-real-ip"] as string;
  const { success } = await rateLimiter.limit(ip);

  if (!success) {
    res.status(429).send({});
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await rateLimiterMiddleware(req, res);

  await NextCors(req, res, {
    methods: ["POST"],
    origin: process.env.CORS_ORIGIN,
    optionsSuccessStatus: 200,
  });

  const { input, walletPublicKey } = req.body;

  // Check for vm
  const vm = findVM(input);
  if (vm) {
    res.status(200).json({
      output: "vm",
    });
    return;
  }

  // Regex action check
  const result = extractVariables(input);
  console.log({ result });

  let response: any;
  let success = true;
  if (result.action && result.amount && result.token) {
    let actionDisplayed;
    if (result.action === "deposit") {
      actionDisplayed = "put in";
    } else if (result.action === "borrow") {
      actionDisplayed = "take out";
    } else {
      actionDisplayed = result.action;
    }

    response = {
      output: `
        It sounds like you want to ${actionDisplayed} ${result.amount} ${result.token}. ${
        walletPublicKey ? "I'm setting up a transaction for you." : "Connect your wallet and let's get started."
      }
      `,
      data: walletPublicKey && {
        action: result.action,
        amount: result.amount,
        tokenSymbol: result.token,
      },
    };
  } else {
    // AI approach if regex fails
    try {
      console.log("calling AI");
      response = await callAI({ input, walletPublicKey });

      // Second string parsing to detect the agent returning an action
      const result = extractVariables(response.output); // todo: parse according to stricter format, to avoid this wrongly returning an action to client
      console.log(response.output);
      console.log({ result });

      if ((response.output as string).startsWith("FORMATTED:") && result.action && result.amount && result.token) {
        let actionDisplayed;
        if (result.action === "deposit") {
          actionDisplayed = "put in";
        } else if (result.action === "borrow") {
          actionDisplayed = "take out";
        } else {
          actionDisplayed = result.action;
        }

        response = {
          output: `
            It sounds like you want to ${actionDisplayed} ${result.amount} ${result.token}. ${
            walletPublicKey ? "I'm setting up a transaction for you." : "Connect your wallet and let's get started."
          }`,
          data: walletPublicKey && {
            action: result.action,
            amount: result.amount,
            tokenSymbol: result.token,
          },
        };
      }
    } catch (error: any) {
      console.error("Error calling OpenAI API:", error);
      response = {
        output: getApologyMessage(),
        error: error.message,
      };
      success = false;
    }
  }

  const bqTableId =
    process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT === "production" ? process.env.NEXT_PUBLIC_OMNI_TABLE_ID : undefined;
  if (bqTableId && process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    try {
      const filename = "service-account.json";
      const filepath = path.join("/tmp", filename);

      // Write some data to the temporary file
      fs.writeFileSync(filepath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, "utf8");
      const bigquery = new BigQuery({ keyFilename: filepath });

      const datasetId = "omni";
      const tableId = bqTableId;
      const rows = [
        {
          timestamp: bigquery.datetime(new Date().toISOString()),
          wallet: walletPublicKey,
          prompt: (input as string).trim(),
          response: (response.output as string).trim(),
          success,
        },
      ];

      await bigquery.dataset(datasetId).table(tableId).insert(rows);
      console.log(`Inserted ${rows.length} rows`);
      fs.rmSync(filepath);
    } catch (error: any) {
      console.error("Failed to log data to BQ:", error);
    }
  }

  res.status(200).json(response);
}
