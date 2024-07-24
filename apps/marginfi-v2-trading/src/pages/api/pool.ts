import type { NextApiRequest, NextApiResponse } from "next";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const PoolAPI = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests are allowed" });
    return;
  }

  try {
    const { email, twitter, mint } = JSON.parse(req.body);

    await resend.emails.send({
      from: "Pool <pool@resend.dev>",
      to: ["pools@mrgn.group"],
      subject: "New pool submission",
      text: `${email} submitted ${mint}`,
      headers: {
        "X-Entity-Ref-ID": "123456789",
      },
      tags: [
        {
          name: "category",
          value: "confirm_email",
        },
      ],
    });

    const { data, error } = await resend.contacts.create({
      email: email,
      firstName: twitter,
      lastName: mint,
      unsubscribed: false,
      audienceId: "9f078100-8480-469d-b218-9c26a11a2e7a",
    });

    if (error) {
      return res.status(400).json(error);
    }
    res.status(200).json(data);
  } catch (error) {
    return res.status(400).json(error);
  }
};

export default PoolAPI;
