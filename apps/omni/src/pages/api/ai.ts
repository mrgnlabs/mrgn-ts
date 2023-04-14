import type { NextApiRequest, NextApiResponse } from "next";
import { callAI } from "~/api/ai";

type Action = 'deposit' | 'borrow' | 'stake' | 'unstake' | null;
type Token = 'USDC' | 'SOL' | 'mSOL' | 'BONK' | 'USDT' | 'ETH' | 'WBTC' | null;

interface ExtractVariablesOutput {
  action: Action;
  amount: number | null;
  token: Token;
}

const extractVariables = (sentence: string): ExtractVariablesOutput => {
  const actionRegex = /(lend|deposit|withdraw|borrow|repay|stake|unstake|superstake|unsuperstake|add|put|give|bring|submit|provide|contribute|take|get|withdrawal|retrieve|repayment|return|earn|gain|collect|dump|stuff|yank|stash|grab|cash-in|cash-out|bounce|withdraw-inate|deposit-ify|plunk|squirrel|park|nest-egg|sock-away|hoard|tuck-away|take out)/;
  const amountRegex = /(\d+(?:\.\d+)?)/;
  const tokenRegex = /(USDC|SOL|mSOL|BONK|USDT|ETH|WBTC)/i;

  const actionMatch = sentence.match(actionRegex);
  const amountMatch = sentence.match(amountRegex);
  const tokenMatch = sentence.match(tokenRegex);

  let action: Action = actionMatch ? actionMatch[0] as Action : null;
  const amount: number | null = amountMatch ? parseFloat(amountMatch[0]) : null;
  const token: Token = tokenMatch ? tokenMatch[0].toUpperCase() as Token : null;

  if (action !== null) {
    if (['lend', 'add', 'put', 'give', 'bring', 'submit', 'provide', 'contribute', 'deposit-ify', 'plunk', 'squirrel', 'park', 'nest-egg', 'sock-away', 'hoard', 'tuck-away'].includes(action)) {
      action = 'deposit';
    } else if (['withdraw', 'pull', 'take', 'get', 'withdrawal', 'retrieve', 'repayment', 'return', 'dump', 'stuff', 'yank', 'stash', 'grab', 'cash-in', 'cash-out', 'bounce', 'withdraw-inate', 'take out'].includes(action)) {
      action = 'borrow';
    } else if (['superstake', 'earn'].includes(action)) {
      action = 'stake';
    } else if (['unsuperstake'].includes(action)) {
      action = 'unstake';
    }
  }

  if (action !== null && !['deposit', 'borrow', 'stake', 'unstake'].includes(action)) {
    action = null;
  }

  return {
    action,
    amount,
    token,
  };
}



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


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const { input, walletPublicKey } = req.body;
  let response;

  // Check if wallet is connected
  if (!walletPublicKey) {
    res.status(200).json({
      output: "It looks like you haven't connected your wallet yet. Connect your wallet and let's get started."
    });
    return;
  }

  // Regex action check
  const result = extractVariables(input);
  console.log({ result })

  if (result.action && result.amount && result.token) {

    let actionDisplayed;
    if (result.action === 'deposit') {
      actionDisplayed = 'put in';
    } else if (result.action === 'borrow') {
      actionDisplayed = 'take out';
    } else {
      actionDisplayed = result.action;
    }

    response = {
      output: `It sounds like you want to ${actionDisplayed} ${result.amount} ${result.token}. I'm setting up a transaction for you.`,
      data: {
        action: result.action,
        amount: result.amount,
        tokenSymbol: result.token,
      }
    }
    res.status(200).json(
      response
    );
    return;
  } else {
    
    // AI approach if regex fails
    try {
      response = await callAI({ input, walletPublicKey });

      res.status(200).json(
        response
      );
      return 
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      res.status(200).json({
        output: getApologyMessage(),
        // @ts-ignore
        error: error.message
      })
      return 
    }
  }
}
