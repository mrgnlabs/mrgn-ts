import type { NextApiRequest, NextApiResponse } from "next";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {

    //
  
    res.status(200).json("OK");
  } catch (error) {

    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }
}
