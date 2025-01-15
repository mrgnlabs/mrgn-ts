import { NextApiRequest, NextApiResponse } from "next";
import { Storage } from "@google-cloud/storage";
import formidable from "formidable";
import fs from "fs/promises";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "mrgn-public";
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  },
});

export const config = {
  api: {
    bodyParser: false, // Disables the default body parser to handle FormData
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Only POST requests are allowed" });
    return;
  }

  const form = new formidable.IncomingForm({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      res.status(500).json({ message: "Error parsing form data" });
      return;
    }

    const images = files.image;
    if (!images) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const file = images[0];

    const bucket = storage.bucket(BUCKET_NAME);
    const destination = `mrgn-token-icons/${file.originalFilename}`;

    try {
      await bucket.upload(file.filepath, {
        destination,
        metadata: {
          contentType: file.mimetype,
        },
      });

      // Clean up the temporary file
      await fs.unlink(file.filepath);

      res.status(200).json({ message: "Image uploaded successfully", path: destination });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
}
