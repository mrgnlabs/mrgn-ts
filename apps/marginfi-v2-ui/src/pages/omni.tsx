import React, { FC, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { TextField } from '@mui/material';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useJupiterApiContext } from "~/context/JupiterApiProvider";
import { isActiveBankInfo, ExtendedBankInfo } from "~/types";
import { superStake, withdrawSuperstake } from "~/components/Swap/superStakeActions";
import { TypeAnimation } from 'react-type-animation';

const AiUI: FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>('');
  const [thinking, setThinking] = useState<boolean>(false);
  
  const { connection } = useConnection();
  const { mfiClient: marginfiClient } = useProgram();
  const { reload: reloadBanks } = useBanks();
  const wallet = useWallet();
  const jupiter = useJupiterApiContext();
  const { extendedBankInfos, selectedAccount, activeBankInfos } = useUserAccounts();

  // Handle form submission for API call
  const handleSubmit = async (e: any) => {
    
    setResponse("");
    setThinking(true)
    e.preventDefault();

    // Define the function to be called at intervals
    // const waitingFunction = async () => {
    //   console.log("Calling entertainment model...");
    //   const res = await axios.post('/api/ai_entertain', {
    //     input: prompt,
    //     walletPublicKey: wallet.publicKey?.toBase58(),
    //   });
    //   setThinking(false);
    //   setResponse(res.data.output);
      
    //   // Perform any other actions you'd like while waiting for the response
    // };

    // Start calling the waitingFunction at specified intervals (e.g., 1000 milliseconds)
    // const intervalId = setInterval(async () => {
    //   await waitingFunction();
    // }, 10000);

    try {
      const res = await axios.post('/api/ai', {
        input: prompt,
        walletPublicKey: wallet.publicKey?.toBase58(),
      });

      // Clear the interval after the request is completed
      // clearInterval(intervalId);
      
      setThinking(false);
      setResponse(res.data.output);
      if (res.data.data) {
        action({ ...res.data.data })
      }
    } catch (error) {
      console.error('Error calling API route:', error);
      setResponse('Error calling API route');

      // Clear the interval in case of an error
      // clearInterval(intervalId);
    }

    setPrompt("");
  };

  const action = async ({ action, amount, tokenSymbol }: { action: string; amount: string; tokenSymbol: string; }) => {
    if (!marginfiClient) return;

    let _marginfiAccount = selectedAccount;

    // If user does not have a marginfi account, throw an error for now.
    if ((action !== 'deposit') && (_marginfiAccount === null)) { throw new Error("User does not have a marginfi account."); }

    const amountFloat = parseFloat(amount);

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

        case 'withdraw':

          const withdrawAll = isActiveBankInfo(bankInfo) ? amountFloat === bankInfo.position.amount : false;
          // @ts-ignore marginfi account is checked above
          await _marginfiAccount.withdraw(amountFloat, bankInfo.bank, withdrawAll);
          
          break;

        case 'borrow':
          
          // perform the borrow action
          // @ts-ignore marginfi account is checked above
          await _marginfiAccount.borrow(parseFloat(amount), bankInfo.bank);
          
          break;

        case 'repay':

          const repayAll = isActiveBankInfo(bankInfo) ? amountFloat === bankInfo.position.amount : false;
          // @ts-ignore marginfi account is checked above
          await _marginfiAccount.repay(amountFloat, bankInfo.bank, repayAll);
          
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
    <div className="top-0 w-full h-full absolute flex flex-col justify-center items-center gap-5 max-w-7xl pb-20">
      {/* Name header */}
      <div className="pb-20 flex justify-center w-4/5 sm:w-3/5" style={{ fontWeight: 200 }}>
        <div className="text-7xl">omni</div>
        <div>omni</div>
      </div>
      {/* Logo and prompt input */}
      <div className="w-4/5 sm:w-3/5 flex items-center gap-5">
        <div className="relative w-[28.02px] h-[24.81px]">
          <div className="absolute w-[1px] h-[1px] top-[13.51px] left-[11.905px] z-[-1]" style={{ boxShadow: '0 0 40px 15px yellow' }}></div>
          <Image src="/marginfi_logo.png" alt="marginfi logo" fill className="z-10"/>
        </div>
        {/* Form submission is dependent on `handleSumbit()` */}
        <form onSubmit={handleSubmit} className="w-full">
          <TextField
            fullWidth
            value={prompt}
            // The prompt input only handles value changing.
            // Actual action isn't taken until enter is pressed.
            onChange={(e) => setPrompt(e.target.value)}
            placeholder='Superstake 7 mSOL'
            InputProps={{
              sx: {
                backgroundColor: '#181C1F',
                color: 'rgb(227, 227, 227)',
                fontSize: '1rem',
                width: '100%',
                fontFamily: 'Aeonik Pro',
              },
            }}
          />
        </form>
      </div>
      {/* The LLM output gets printed below the prompt. */}
      <div className="min-h-[50px] flex w-3/5 font-[rgb(227, 227, 227)]" style={{ fontFamily: "monospace" }}>
        {
          (!response) && thinking &&
          <TypeAnimation
            sequence={["Hmm... let me think..."]}
            speed={90}
          />
        }
        {
          response &&
          <TypeAnimation
            sequence={[response]}
            speed={90}
          />
        }
      </div>
    </div>
  )
}

export default AiUI;
