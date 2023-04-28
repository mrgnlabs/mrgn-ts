import { OpenAI } from "langchain";
import { PineconeClient } from "@pinecone-database/pinecone";
import { PineconeStore } from "langchain/vectorstores";
import { VectorDBQAChain } from "langchain/chains";
import { OpenAIEmbeddings } from "langchain/embeddings";
import { ChainTool } from "langchain/tools";

const getPineconeClient = async () => {
  const client = new PineconeClient();
  if (!process.env.PINECONE_API_KEY) throw new Error("PINECONE_API_KEY not set");
  if (!process.env.PINECONE_ENVIRONMENT) throw new Error("PINECONE_ENVIRONMENT not set");

  await client.init({
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT,
  });

  return client;
};

const getOmniVectorChain = async () => {
  // Get base OpenAI model
  const model = new OpenAI({
    modelName: "text-davinci-003",
    openAIApiKey: process.env.OPENAI_API_KEY,
    maxTokens: 1000,
    temperature: 0,
    verbose: true,
  });

  // Set up Pinecone client
  const client = await getPineconeClient();
  if (!process.env.PINECONE_INDEX) throw new Error("PINECONE_INDEX not set");
  const pineconeIndex = client.Index(process.env.PINECONE_INDEX);
  const vectorStore = await PineconeStore.fromExistingIndex(new OpenAIEmbeddings(), { pineconeIndex });
  const vectorChain = VectorDBQAChain.fromLLM(model, vectorStore);

  return vectorChain;
};
const getOmniQaTool = async () => {
  const vectorChain = await getOmniVectorChain();
  const omniQa = new ChainTool({
    name: "omni-qa",
    description: `
                A tool to answer questions about blockchain. Like a second brain for you. Useful when you want to reference a library of knowledge. Here are some protocols this can help you with: Drift, Meteora, Jupiter, Tensor, Mango, Zeta, Kamino, Marinade, Lido, Orca, Raydium, Francium, Jito, Cega, Lifinity, Hubble, UXD, marginfi, Cypher. Input should be a question.
            `,
    chain: vectorChain,
  });

  return omniQa;
};

export { getOmniQaTool, getOmniVectorChain };
