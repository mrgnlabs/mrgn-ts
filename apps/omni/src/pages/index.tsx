import React, { FC, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import axios from "axios";
import { TextField } from "@mui/material";
import { useWallet } from "@solana/wallet-adapter-react";
import { useBanks, useUserAccounts, useJupiterApiContext } from "~/context";
import { TypeAnimation } from "react-type-animation";
import { InputAdornment } from "@mui/material";
import { FormEventHandler } from "react";
import { SAMPLE_PROMPTS, dispatchMarginfiAction } from "@mrgnlabs/omni-common";

const AiUI: FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [thinking, setThinking] = useState<boolean>(false);
  const [transacting, setTransacting] = useState<boolean>(false);
  const [transactionFailed, setTransactionFailed] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);

  const { reload: reloadBanks } = useBanks();
  const wallet = useWallet();
  const jupiter = useJupiterApiContext();
  const { extendedBankInfos, selectedAccount } = useUserAccounts();

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
      const {
        data: { output: botResponse, error: botError, data: actionDispatchData },
      } = await axios.post("/api/ai", {
        input: prompt,
        walletPublicKey: wallet.publicKey?.toBase58(),
      });

      setThinking(false);
      setResponse(botResponse);
      if (botError) {
        setFailed(true);
      }
      if (actionDispatchData) {
        setTransacting(true);
        const actionSuccess = await dispatchMarginfiAction({
          action: actionDispatchData.action,
          amount: actionDispatchData.amount,
          tokenSymbol: actionDispatchData.tokenSymbol,
          marginfiAccount: selectedAccount,
          extendedBankInfos,
          jupiter,
          reloadBanks,
        });
        setTransactionFailed(!actionSuccess);
        setTransacting(false);
      }
    } catch (error) {
      console.error("Error calling API route:", error);
      setResponse("Sorry, I was helping Polygon catch up. Please try again.");
      setFailed(true);
    }
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
