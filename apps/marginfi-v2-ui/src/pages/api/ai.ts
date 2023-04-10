import type { NextApiRequest, NextApiResponse } from "next";
import { callAI } from "~/api/ai";


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

  const { input } = req.body;
  const response = await callAI(input);
  console.log(response);

  try {
  
    res.status(200).json(response.output);
  } catch (error) {

    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Error calling OpenAI API' });

  }
}
