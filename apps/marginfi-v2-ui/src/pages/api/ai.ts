import type { NextApiRequest, NextApiResponse } from "next";
import { callAI } from "~/api/ai";


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

  while (attempts < maxAttempts) {
    try {
      response = await callAI({ input, walletPublicKey });
      console.log("response on api side:")
      console.log({ response: JSON.stringify(response) })
      break;
    } catch (error) {
      attempts++;
      console.error('Error calling OpenAI API:', error);
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
