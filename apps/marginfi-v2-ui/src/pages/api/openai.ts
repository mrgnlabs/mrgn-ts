import type { NextApiRequest, NextApiResponse } from "next";
import axios from 'axios';

// const prePrompt = `
//   You're part of an app that's used to help people interact with a decentralized lending protocol on Solana called marginfi.
//   In this app, there are two products:

//   1) Traditional lending
//   2) Superstake

//   We're going to focus exclusively on Superstake, sometimes "⚡️stake" for short.

//   The superstake product supports only two user functions:

//   1) "Superstake"
//   2) "Unstake"

//   When users superstake, they choose X amount of mSOL to deposit into marginfi. Upon superstaking, users will deposit X amount of mSOL into marginfi, automatically borrow the maximum allowed amount of SOL against their newly deposited mSOL collateral, swap that SOL for mSOL via Marinade Finance's instant staking feature, and deposit the newly acquired mSOL into marginfi to go through the process again. Historically, this process has been known as "looping". It allows users to lever up their liquid staking tokens (in this case, mSOL) to earn leveraged staking yield.

//   Users are given free reign to input anything they want below, and we need to figure out if they want to take one of the legal actions above (superstake or unstake), or if they intentionally want to try something else.

//   Follow these directions strictly when interpreting user input:

//   1. If the user says "stake", "superstake", "deposit", or something similar, assume they meant superstake.
//   2. If the user says "withdraw", "unwind", "give me back", or something similar, assume they meant unstake.
//   3. The Superstake product only supports depositing or withdrawing mSOL. If a user says they want to do something with SOL, assume they meant mSOL. If a user says they want to do something with jitoSOL or stSOL, assume they meant mSOL.
//   4. If a user input is ambigious, tell them a bit about superstaking and suggest they superstake some mSOL.
//   5. If it looks like a user is intentionally trying to do an illegal action, tell them they can't do that.
//   6. The user MUST specify how much mSOL they want to superstake or unstake, and the amount must be specified as a real number above 0 with no more than 9 decimals. If the user doesn't specify the amount or if the amount does not fit the aforementioned criteria, consider the intended action illegal and ask the user to specify the amount.

//   If a user is trying to do a legal action, format your response like this:

//   "Setting up a transaction for you to [PREDICTED_USER_ACTION]...", where PREDICTED_USER_ACTION is what you're predicting the user wants to do. MAKE SURE YOUR RESPONSE IS ONLY IN THE FORMAT ""Setting up a transaction for you to [PREDICTED_USER_ACTION]..."". YOUR RESPONSE GOES DIRECTLY TO THE USER, ACT LIKE YOU'RE TALKING TO THEM. They'll need to confirm the action in their Solana wallet before anything happens, so don't worry about actually executing the transaction.

//   Here's the user input:


// `

const prePrompt = `
  I'm going to say things, and I want you to figure out what I want to do. I can only desire to do one of three things:

  1. Superstake X amount of mSOL
  2. Unstake X amount of mSOL
  3. Something else that's not allowed.

  If I say "deposit" or something similar, assume I  meant superstake.
  If I say "withdraw" or something similar, assume I meant unstake.
  If I use any other ticker than SOL, assume the action is illegal.

  ALWAYS Return your format in a json following this type interface:

  interface ActionValue {
    action: 'superstake' | 'unstake' | 'illegal' |;
    value: number;
  }

  Return no other text than the json object.
  
  The value CANNOT be anything but a valid number above 0 with no more than 9 decimals. If you don't know the exact number from the prompt or if the number doesn't adhere to being over 0 or having no more than 9 decimals, assume it's 0 and that the action is illegal.

  Here is my input:
`

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/completions',
      {
        model: 'text-davinci-003',
        prompt: `${prePrompt} ${req.body.prompt}`,
        max_tokens: req.body.max_tokens || 50,
        n: 1,
        stop: null,
        temperature: 1,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
      }
    );
    
    console.log('OpenAI API response:', response.data)
    res.status(200).json(response.data.choices[0]);
  } catch (error) {

    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }
}
