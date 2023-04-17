import React, { FC, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { TextField } from '@mui/material';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useJupiterApiContext } from "~/context/JupiterApiProvider";
import { superStake, withdrawSuperstake } from "~/components/superStakeActions";
import { TypeAnimation } from 'react-type-animation';
import { InputAdornment } from '@mui/material';

const AiUI: FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [thinking, setThinking] = useState<boolean>(false);
  const [failed, setFailed] = useState<boolean>(false);
  
  const { connection } = useConnection();
  const { mfiClient: marginfiClient } = useProgram();
  const { reload: reloadBanks } = useBanks();
  const wallet = useWallet();
  const jupiter = useJupiterApiContext();
  const { extendedBankInfos, selectedAccount } = useUserAccounts();

  // Handle form submission for API call
  const handleSubmit = async (e: any) => {
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
        action({ ...res.data.data });
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
  const action = async ({ action, amount, tokenSymbol }: { action: string; amount: string; tokenSymbol: string; }) => {
    if (!marginfiClient) return;

    let _marginfiAccount = selectedAccount;

    // If user does not have a marginfi account, throw an error for now.
    // @todo If the account doesn't exist and the user is trying to take an action other than deposit,
    // tell the user in prompt response that they need to deposit first.
    if ((action !== 'deposit') && (_marginfiAccount === null)) { throw new Error("User does not have a marginfi account."); }

    const amountFloat = parseFloat(amount);

    // Types: 
    const bankInfo = extendedBankInfos.find((bank) => bank.tokenName.toUpperCase() === tokenSymbol)
    if (!bankInfo) {
      throw new Error(`Bank info was not found, tokenSymbol: ${tokenSymbol} bankInfo: ${bankInfo}`);
    }

    let mSOLBank;
    let SOLBank;

    try {
      switch (action) {
        case 'deposit':
          // Check if the user has a marginfi account
          if (_marginfiAccount === null) {
            try {
              // If the user does not have a marginfi account, create one for them.

              // First, we double check that we don't have a state management problem.
              const userAccounts = await marginfiClient.getMarginfiAccountsForAuthority();
              if (userAccounts.length > 0) {
                try {
                  await reloadBanks();
                } catch (error: any) {
                  console.log(`Error while reloading state: ${error}`)
                }
              }

              // If we're all good on state, we create an account
              _marginfiAccount = await marginfiClient.createMarginfiAccount();
            } catch (error: any) {
              console.log(`Error while reloading state: ${error}`)
              break;
            }
          }
          
          console.log("constructing transaction");

          // perform the deposit action
          await _marginfiAccount.deposit(
            amountFloat,
            bankInfo.bank,
          );

          break;

        case 'borrow':
          
          // perform the borrow action
          // @ts-ignore marginfi account is checked above
          await _marginfiAccount.borrow(parseFloat(amount), bankInfo.bank);
          
          break;

        case 'stake':

          mSOLBank = extendedBankInfos.find((bank) => bank.tokenName === "mSOL");
          if (!mSOLBank) { throw new Error("mSOL bank info was not found"); }
          SOLBank = extendedBankInfos.find((bank) => bank.tokenName === "SOL");
          if (!SOLBank) { throw new Error("SOL bank info was not found"); }

          await superStake(
            // @ts-ignore marginfi account is checked above
            _marginfiAccount,
            connection,
            wallet,
            amountFloat,
            mSOLBank,
            SOLBank,
            reloadBanks
          )
          
          break;

        case 'unstake':

          mSOLBank = extendedBankInfos.find((bank) => bank.tokenName === "mSOL");
          if (!mSOLBank) { throw new Error("mSOL bank info was not found"); }
          SOLBank = extendedBankInfos.find((bank) => bank.tokenName === "SOL");
          if (!SOLBank) { throw new Error("SOL bank info was not found"); }

          await withdrawSuperstake(
            // @ts-ignore marginfi account is checked above
            _marginfiAccount,
            connection,
            wallet,
            amountFloat,
            mSOLBank,
            SOLBank,
            reloadBanks,
            jupiter,
          )
          
          break;
      
        default:
          console.log("Invalid action passed to action().")
          break;
      } 
    } catch (error: any) {
      console.log(`Error while performing action '${action}': ${error}`)
    }
  }

  return (
    <div
      className="top-[112px] sm:top-0 w-full h-full absolute flex flex-col justify-start sm:justify-center items-center gap-8 max-w-7xl"
    >
      {/* Name header */}
      <div className="w-4/5 sm:w-3/5 hidden sm:flex flex-col justify-center gap-8 pb-10" style={{ fontWeight: 200 }}>
        <div className="flex justify-center items-center w-full">
          <div className="relative w-[23.259px] h-[24.81px] mr-1 mt-4 z-10">
            <Image src="/omni_circle.png" alt="omni logo" fill />
          </div>
          <div className="text-7xl" style={{ color: '#2F3135' }}>omni</div>
        </div>
        <div className="text-xl text-center" style={{ color: '#2F3135', fontWeight: 300 }}>Redefining the web3 experience. Powered by AI.</div>
      </div>

      {/* Logo and prompt input */}
      <div
        className="w-4/5 sm:w-3/5 flex items-center gap-5"
      >
        <div className="relative w-[28.02px] h-[24.81px]">
          <div className="absolute w-[1px] h-[1px] top-[13.51px] left-[11.905px] z-[-1]"></div>
          <Image src="/marginfi_logo.png" alt="marginfi logo" fill className="z-10"/>
        </div>
        {/* Form submission is dependent on `handleSumbit()` */}
        <form onSubmit={handleSubmit} className="w-full border-none" style={{ border: 'solid red 1px' }}>
          <TextField
            fullWidth
            value={prompt}
            // The prompt input only handles value changing.
            // Actual action isn't taken until enter is pressed.
            onFocus={() => {
              setPrompt("");
            }}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Ask me who I am'
            variant="standard"
            InputProps={{
              disableUnderline: true, // <== added this
              sx: {
                backgroundColor: '#C2B2A0',
                color: '#000',
                fontSize: '1rem',
                width: '100%',
                height: '60px',
                fontFamily: 'Aeonik Pro',
                padding: '0 1rem',
                border: 'solid 2px #C2B2A0 !important',
                borderRadius: '4px',
              },
              style: {
                outline: 'none !important',
                border: 'none !important',
              },
              endAdornment: (
                <InputAdornment position="end">
                  {thinking && !failed && !response && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/pending.png" alt="pending" fill className="pulse" />
                    </div>
                  )}
                  {!thinking && response && !failed && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/confirmed.png" alt="confirmed" fill />
                    </div>
                  )}
                  {failed && (
                    <div className="relative w-[32px] h-[32px] z-10">
                      <Image src="/failed.png" alt="failed" fill />
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
              borderRadius: '15px 15px 15px 15px'
            }}
          >
            {
              (!response) && (!thinking) &&
              <TypeAnimation
                style={{ color: '#262B2F !important'}}
                sequence={[`
                  Hi, I'm Omni - an experiment in Crypto + AI.
                  I'm an autonomous agent that can interact with protocols for you, answer questions about web3, and provide you with realtime market data.
                  What would you like to do today?
                `]}
                speed={70}
              />
            }
            {
              (!response) && thinking &&
              <TypeAnimation
                style={{ color: '#262B2F !important'}}
                sequence={["Hmm... let me think..."]}
                speed={70}
              />
            }
            {
              response &&
              <TypeAnimation
                style={{ color: '#262B2F !important '}}
                sequence={[response]}
                speed={70}
              />
            }
          </div>
            <div className="absolute w-[100px] h-[100px] z-10" style={{ right: '-40px', top: '-40px' }}>
              <Image src="/orb.png" alt="orb" fill className="pulse"/>
            </div>
        </div>
      </div>
    </div>
  )
}

export default AiUI;
