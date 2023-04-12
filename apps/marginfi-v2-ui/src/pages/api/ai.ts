import type { NextApiRequest, NextApiResponse } from "next";
import { callAI } from "~/api/ai";

const extractVariables = (sentence: string) => {
  const actionRegex = /(deposit|withdraw|borrow|repay|stake|unstake)/;
  const amountRegex = /(\d+(?:\.\d+)?)/;
  const tokenRegex = /(USDC|SOL|mSOL|BONK|USDT|ETH|WBTC)/;

  const actionMatch = sentence.match(actionRegex);
  const amountMatch = sentence.match(amountRegex);
  const tokenMatch = sentence.match(tokenRegex);

  const action = actionMatch ? actionMatch[0] : null;
  const amount = amountMatch ? parseFloat(amountMatch[0]) : null;
  const token = tokenMatch ? tokenMatch[0] : null;

  return {
    action,
    amount,
    token,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const { input, walletPublicKey } = req.body;

  let response;
  let attempts = 0;
  const maxAttempts = 3;

  if (!walletPublicKey) {
    res.status(200).json({
      output: "It looks like you haven't connected your wallet yet. Connect your wallet and let's get started."
    });
    return;
  }

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
      // @todo running retry attempts here creates a lot of overhead because the manager agent has to choose the direction again
    // improve this
    while (attempts < maxAttempts) {
      try {
        console.log({ attempts })
        response = await callAI({ input, walletPublicKey });
        console.log("response on api side:")
        console.log({ response: JSON.stringify(response) })
        break;
      } catch (error) {
        attempts++;
        console.error('Error calling OpenAI API:', error);
      }
    }
  }

  try {
    res.status(200).json(
      response
    );
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });
  }
}
