import React, { FC, useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import axios from 'axios';
import { TextField } from '@mui/material';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useJupiterApiContext } from "~/context/JupiterApiProvider";
import { ExtendedBankInfo } from "~/types";
import { superStake, withdrawSuperstake } from "~/components/Swap/superStakeActions";
import { TypeAnimation } from 'react-type-animation';

const AiUI: FC = () => {
  // State variables for holding input and output text, the amount to super stake or withdraw, and the mSOL and SOL bank information
  const [prompt, setPrompt] = useState<string>("");
  const [response, setResponse] = useState<string>('');
  
  const wallet = useWallet();

  // const { mfiClient } = useProgram();
  // const [mSOLBank, setmSOLBank] = useState<ExtendedBankInfo>();
  // const [solBank, setSOLBank] = useState<ExtendedBankInfo>();
  // const { extendedBankInfos, selectedAccount, activeBankInfos } = useUserAccounts();
  // // const { tokenAccountMap } = useTokenAccounts();
  // const { reload: reloadBanks } = useBanks();
  // const { connection } = useConnection();
  // const wallet = useWallet();
  // const jupiter = useJupiterApiContext();

  // Reset display text and super stake/withdraw amount when the component mounts
  // useEffect(() => {
  //   setResponse('')
  // }, [])

  // Handle form submission for API call
  const handleSubmit = async (e) => {
    setResponse("");
    e.preventDefault();

    try {
      const res = await axios.post('/api/ai', {
        input: prompt,
        walletPublicKey: wallet.publicKey?.toBase58(),
      });
      setResponse(res.data.output);
      if (res.data.data) {
        setUpTransaction({ ...res.data.data })
      }
    } catch (error) {
      console.error('Error calling API route:', error);
      setResponse('Error calling API route');
    }

    setPrompt("");
  };

  const setUpTransaction = async ({ action, amount, tokenSymbol }: { action: string; amount: string; tokenSymbol: string; }) => {
    console.log({
      action, amount, tokenSymbol
    })
  }

  // Set mSOL and SOL bank information when the user accounts context is updated
  // useEffect(() => {
  //   setSOLBank(
  //     extendedBankInfos.find((bank) => bank.tokenName === "SOL")
  //   )
  //   setmSOLBank(
  //     extendedBankInfos.find((bank) => bank.tokenName === "mSOL")
  //   )
  // }, [extendedBankInfos])

  // const actionSuperStake = useCallback(async (superStakeOrWithdrawAmount: number ) => {
  //   if (mfiClient === null || !mSOLBank || !solBank || !selectedAccount) return;
  //   let marginfiAccount = selectedAccount;
  //   if (superStakeOrWithdrawAmount <= 0) {
  //     setResponse('Please enter a valid amount above 0.');
  //     return;
  //   }

  //   try {
  //     await superStake(
  //       marginfiAccount,
  //       connection,
  //       wallet,
  //       superStakeOrWithdrawAmount,
  //       mSOLBank,
  //       solBank,
  //       reloadBanks
  //     )
  //   } catch (error: any) {
  //     setResponse("I'm sorry, there was an error. Please try again.")
  //   }

  //   try {
  //     await reloadBanks();
  //   } catch (error: any) {
  //     setResponse("There was an error reloading banks. Please refresh the page.")
  //   }

  // }, [mfiClient, mSOLBank, solBank, selectedAccount, reloadBanks])

  // const actionUnstake = useCallback(async (superStakeOrWithdrawAmount: number) => {
  //   if (mfiClient === null || !mSOLBank || !solBank || !selectedAccount) return;
  //   let marginfiAccount = selectedAccount;
  //   if (superStakeOrWithdrawAmount <= 0) {
  //     setResponse('Please enter a valid amount above 0.');
  //     return;
  //   }

  //   try {
  //     await withdrawSuperstake(
  //       marginfiAccount,
  //       connection,
  //       wallet,
  //       superStakeOrWithdrawAmount,
  //       mSOLBank,
  //       solBank,
  //       reloadBanks,
  //       jupiter,
  //     )
  //   } catch (error: any) {
  //     setResponse("I'm sorry, there was an error. Please try again.")
  //   }

  //   try {
  //     await reloadBanks();
  //   } catch (error: any) {
  //     setResponse("There was an error reloading banks. Please refresh the page.")
  //   }

  // }, [mfiClient, mSOLBank, solBank, selectedAccount, reloadBanks])

  // useEffect(() => {

  //   const regex = /It sounds like you want to (\w+) (\d+) mSOL.*/;
  //   const match = response.match(regex);

  //   if (match) {
  //     const [fullMatch, action, amount] = match;

  //     console.log({
  //       action, amount
  //     })

  //     if (action === 'superstake') {
  //       actionSuperStake(
  //         parseFloat(amount)
  //       )
  //     }

  //     if (action === 'unstake') {
  //       actionUnstake(
  //         parseFloat(amount)
  //       )
  //     }
  //   }
  // },[response]);

  return (
    <div className="top-0 w-full h-full absolute flex flex-col justify-center items-center gap-5 max-w-7xl">
      {/* Name header */}
      <div className="text-5xl flex justify-between w-3/5 ml-24" style={{ fontWeight: 500 }}>
        <div>marginfi</div>
      </div>
      {/* Logo and prompt input */}
      <div className="w-3/5 flex items-center gap-5">
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
            placeholder='Enter a prompt, like "I want to superstake 10 mSOL."'
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
