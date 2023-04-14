import { Tool } from "langchain/tools";

class MarginfiGlossary extends Tool {
  name = "marginfi-glossary-tool";

  description =
    "A tool to understand marginfi-specific terms. Use this tool when the user asks about marginfi-specific concepts, especially acronyms of products like: [superstake, mrgnlend, UTP, vault, black box, or omni]. If the user is *not* asking about something part of the marginfi protocol (e.g. if they're asking about a different protocol), use the omni-qa tool. Input should be null."

  constructor() {
    super();
  }

  async _call(): Promise<string> {

    const GLOSSARY = `
    Here is a glossary of marginfi-specific terms. Use these to understand the marginfi universe.

    marginfi: A decentralized finance (DeFi) native prime brokerage enabling users to access various decentralized exchanges (DeXs) on the Solana blockchain and cross-margin positions across these DeXs.

    superstake: A leveraged staking strategy in marginfi, allowing users to deposit SOL LSTs and earn boosted yield by borrowing SOL against their deposit and swapping it into more LST.

    mrgnlend: An overcollateralized borrow-lend protocol within marginfi that simplifies borrowing and lending various cryptocurrencies on the Solana blockchain.

    UTP (Underlying Trading Protocol): A term in marginfi referring to downstream venues integrated with the platform to enable a unified trading experience across multiple DeFi services.

    vault: A delta-neutral trading strategy built on marginfi, which allows users to deposit USDC and earn yield from perpetual arbitrage. It leverages various UTPs to provide a sophisticated arbitrage strategy. Vault is no longer live.

    Blackbox: The first actively managed vault in marginfi, allocating funds into different arbitrage strategies to generate market-neutral yield. Blackbox is no longer live.

    Omni: The first defi interface powered by AI. designed to make complex DeFi strategies easily accessible to users.
    `

    return GLOSSARY;
  }
}

export { MarginfiGlossary }
