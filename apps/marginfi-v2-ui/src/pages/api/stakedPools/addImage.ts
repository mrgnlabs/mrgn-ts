import { NextApiRequest, NextApiResponse } from "next";
import { Storage } from "@google-cloud/storage";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, method } = req;

  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests are allowed" });
    return;
  }

  if (!query.filename) {
    res.status(400).json({ message: "No filename provided" });
    return;
  }

  const bucket = storage.bucket(BUCKET_NAME);

  try {
    const file = bucket.file(`mrgn-token-icons/${query.filename}`);

    const options = {
      version: "v4",
      action: "write",
      expires: Date.now() + 5 * 60 * 1000, //  5 minutes,
      fields: { "x-goog-meta-source": "nextjs-project" },
      contentType: "image/png",
    };
    const [response] = await file.generateSignedPostPolicyV4(options);
    res.status(200).json(response);
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
