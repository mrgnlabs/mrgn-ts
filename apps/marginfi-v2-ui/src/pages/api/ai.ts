import type { NextApiRequest, NextApiResponse } from "next";
import { callAI } from "~/api/ai";


// Extract variables
const extractVariables = (sentence: string) => {
  const actionRegex = /(deposit|withdraw|borrow|repay|stake|unstake|superstake|unsuperstake)/;
  const amountRegex = /(\d+(?:\.\d+)?)/;
  const tokenRegex = /(USDC|SOL|mSOL|BONK|USDT|ETH|WBTC)/;

  const actionMatch = sentence.match(actionRegex);
  const amountMatch = sentence.match(amountRegex);
  const tokenMatch = sentence.match(tokenRegex);

  let action = actionMatch ? actionMatch[0] : null;
  const amount = amountMatch ? parseFloat(amountMatch[0]) : null;
  const token = tokenMatch ? tokenMatch[0] : null;

  if (action === 'superstake') {
    action = 'stake';
  } else if (action === 'unsuperstake') {
    action = 'unstake';
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
    response = {
      output: `It sounds like you want to ${result.action} ${result.amount} ${result.token}. I'm setting up a transaction for you.`,
      data: {
        action: result.action,
        amount: result.amount,
        tokenSymbol: result.token,
      }
    }
  } else {
    
    // AI approach if regex fails
    try {
      response = await callAI({ input, walletPublicKey });

      return res.status(200).json(
        response
      );
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return res.status(200).json({
        output: getApologyMessage()
      })
    }
  }
}
