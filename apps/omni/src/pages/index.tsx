import React, { FC, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import axios from "axios";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";

import { useWallet } from "@solana/wallet-adapter-react";
import { TypeAnimation } from "react-type-animation";
import { FormEventHandler } from "react";
import { useMrgnlendStore } from "~/store";

const SAMPLE_PROMPTS = [
  "Show me my account, fool!",
  "Deposit 10 USDC into marginfi",
  "I want to lend 100 usdc on marginfi",
  "Can I borrow 1 SOL from marginfi?",
  "Withdraw all my USDC from marginfi",
  "How much SOL do I have deposited in marginfi?",
  "How much BONK do I have deposited in marginfi?",
  "Is DUST supported on marginfi?",
  "Show me my debt on marginfi",
  "How is my health calculated on hubble?",
  "给我查下最新的eth价格",
  "What is dialect?",
  "크립토 시장이 성장할 거라고 생각하니?",
  "Hola, que sabes sobre bitcoin?",
];

const AiUI: FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [thinking, setThinking] = useState<boolean>(false);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  const wallet = useWallet();
  const [marginfiClient, selectedAccount, extendedBankInfos] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.selectedAccount,
    state.extendedBankInfos,
  ]);

  const samplePrompt = useMemo(() => {
    return SAMPLE_PROMPTS[Math.floor(Math.random() * SAMPLE_PROMPTS.length)];
  }, []);

  const resetState = useCallback(() => {
    setPrompt("");
    setThinking(false);
    setTransacting(false);
    setFailed(false);
    setTransactionFailed(false);
  }, []);

  // Handle form submission for API call
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (e) => {
    setFailed(false);
    setResponse("");
    setThinking(true);
    e.preventDefault();

    try {
      const res = await axios.post("/api/ai", {
        input: prompt,
        walletPublicKey: wallet.publicKey?.toBase58(),
      });

      setThinking(false);
      setResponse(res.data.output);
      if (res.data.error) {
        setFailed(true);
      }
      if (res.data.data) {
        setTransacting(true);
        const actionSuccess = await action({ ...res.data.data });
        setTransactionFailed(!actionSuccess);
        setTransacting(false);
      }
    } catch (error) {
      console.error("Error calling API route:", error);
      setResponse("Sorry, I was helping Polygon catch up. Please try again.");
      setFailed(true);
    }
  };

  // generic functions are now:
  // deposit()
  // borrow()
  // the endpoint needs to return one of these ^
  const action = async ({
    action,
    amount,
    tokenSymbol,
  }: {
    action: string;
    amount: string;
    tokenSymbol: string;
  }): Promise<boolean> => {
    if (!marginfiClient) return false;

    let _marginfiAccount = selectedAccount;

    // If user does not have a marginfi account, throw an error for now.
    // @todo If the account doesn't exist and the user is trying to take an action other than deposit,
    // tell the user in prompt response that they need to deposit first.
    if (action !== "deposit" && _marginfiAccount === null) {
      throw new Error("User does not have a marginfi account.");
    }

    const amountFloat = parseFloat(amount);

    // Types:
    const bankInfo = extendedBankInfos.find((bank) => bank.meta.tokenSymbol.toUpperCase() === tokenSymbol);
    if (!bankInfo) {
      throw new Error(`Bank info was not found, tokenSymbol: ${tokenSymbol} bankInfo: ${bankInfo}`);
    }

    try {
      switch (action) {
        case "deposit":
          if (_marginfiAccount === null) {
            try {
              // If the user does not have a marginfi account, create one for them.
              _marginfiAccount = await marginfiClient.createMarginfiAccount();
            } catch (error: any) {
              throw new Error(`Error while creating marginfi account: ${error}`);
            }
          }

          console.log("constructing transaction");

          // perform the deposit action
          await _marginfiAccount.deposit(amountFloat, bankInfo.address);

          break;

        case "borrow":
          // perform the borrow action
          //@ts-ignore (mfi)
          await _marginfiAccount.borrow(parseFloat(amount), bankInfo.address);

          break;

        default:
          console.log("Invalid action passed to action().");
          break;
      }
    } catch (error: any) {
      console.log(`Error while performing action '${action}': ${error}`);
      return false;
    }

    return true;
  };

  return (
    <div className="top-[112px] sm:top-0 w-full h-full absolute flex flex-col justify-start sm:justify-center items-center gap-8 max-w-7xl">
      {/* Name header */}
      <div className="w-4/5 sm:w-3/5 hidden sm:flex flex-col justify-center gap-8 pb-10" style={{ fontWeight: 200 }}>
        <div className="flex justify-center items-center w-full">
          <div className="relative w-[23.259px] h-[24.81px] mr-1 mt-4 z-10">
            <Image src="/omni_circle.png" alt="omni logo" fill />
          </div>
          <div className="text-7xl" style={{ color: "#2F3135" }}>
            omni
          </div>
        </div>
        <div className="text-xl text-center" style={{ color: "#2F3135", fontWeight: 300 }}>
          Redefining the web3 experience. Powered by AI.
        </div>
      </div>

      {/* Logo and prompt input */}
      <div className="w-4/5 sm:w-3/5 flex items-center gap-5">
        <div className="relative w-[28.02px] h-[24.81px]">
          <div className="absolute w-[1px] h-[1px] top-[13.51px] left-[11.905px] z-[-1]"></div>
          <Image src="/marginfi_logo.png" alt="marginfi logo" fill className="z-10" />
        </div>
        {/* Form submission is dependent on `handleSumbit()` */}
        <form onSubmit={handleSubmit} className="w-full border-none" style={{ border: "solid red 1px" }}>
          <TextField
            fullWidth
            value={prompt}
            disabled={thinking || transacting}
            // The prompt input only handles value changing.
            // Actual action isn't taken until enter is pressed.
            onClick={() => {
              if (response && !thinking && !transacting) resetState();
            }}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={samplePrompt}
            variant="standard"
            InputProps={{
              disableUnderline: true, // <== added this
              sx: {
                backgroundColor: "#C2B2A0",
                color: "#000",
                fontSize: "1rem",
                width: "100%",
                height: "60px",
                fontFamily: "Aeonik Pro",
                padding: "0 1rem",
                border: "solid 2px #C2B2A0 !important",
                borderRadius: "4px",
              },
              style: {
                outline: "none !important",
                border: "none !important",
              },
              endAdornment: (
                <InputAdornment position="end">
                  {thinking && !failed && !response && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/pending.png" alt="pending" fill className="pulse" />
                    </div>
                  )}
                  {prompt && !thinking && !transacting && response && !failed && !transactionFailed && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/confirmed.png" alt="confirmed" fill />
                    </div>
                  )}
                  {(failed || transactionFailed) && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/failed.png" alt="failed" fill />
                    </div>
                  )}
                  {transacting && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/transacting.png" alt="transacting" fill className="pulse" />
                    </div>
                  )}
                </InputAdornment>
              ),
            }}
          />
        </form>
      </div>
      {/* The LLM output gets printed below the prompt. */}
      <div className="relative max-w-[80%] sm:max-w-[60%]">
        <div className="w-full flex shrink">
          <div
            className="min-h-[100px] w-full flex font-[#262B2F] bg-[#D9D9D9] p-4 pr-24"
            style={{
              borderRadius: "15px 15px 15px 15px",
            }}
          >
            {!response && !thinking && (
              <TypeAnimation
                style={{ color: "#262B2F !important" }}
                sequence={[
                  `
                  Hi, I'm Omni - an experiment in Crypto + AI.
                  I'm an autonomous agent that can interact with protocols for you, answer questions about web3, and provide you with realtime market data.
                  What would you like to do today?
                `,
                ]}
                speed={70}
              />
            )}
            {!response && thinking && (
              <TypeAnimation style={{ color: "#262B2F !important" }} sequence={["Hmm... let me think..."]} speed={70} />
            )}
            {response && <TypeAnimation style={{ color: "#262B2F !important " }} sequence={[response]} speed={70} />}
          </div>
          <div className="absolute w-[100px] h-[100px] z-10" style={{ right: "-40px", top: "-40px" }}>
            <Image src="/orb.png" alt="orb" fill className="pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiUI;
