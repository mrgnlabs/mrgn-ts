import React, { FC, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { TextField } from '@mui/material';

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useBanks, useProgram, useUserAccounts } from "~/context";
import { useJupiterApiContext } from "~/context/JupiterApiProvider";
import { ExtendedBankInfo } from "~/types";
import { superStake, withdrawSuperstake } from "~/components/Swap/superStakeActions";

const AiUI: FC = () => {
  // State variables for holding input and output text, the amount to super stake or withdraw, and the mSOL and SOL bank information
  const [prompt, setPrompt] = useState(null);
  const [response, setResponse] = useState<string>('');
  const [displayText, setDisplayText] = useState('')

  const { mfiClient } = useProgram();
  const [mSOLBank, setmSOLBank] = useState<ExtendedBankInfo>();
  const [solBank, setSOLBank] = useState<ExtendedBankInfo>();
  const { extendedBankInfos, selectedAccount } = useUserAccounts();
  const { reload: reloadBanks } = useBanks();
  const { connection } = useConnection();
  const wallet = useWallet();
  const jupiter = useJupiterApiContext();

  // Reset display text and super stake/withdraw amount when the component mounts
  useEffect(() => {
    setDisplayText('');
  }, [])

  // Handle form submission for API call
  const handleSubmit = async (e) => {
    setDisplayText('');
    e.preventDefault();
    try {
      const apiResponse = await axios.post('/api/openai', {
        prompt: prompt,
        max_tokens: 50,
      });
      setResponse(apiResponse.data);
    } catch (error) {
      console.error('Error calling API route:', error);
      setResponse('Error calling API route');
    }
  };

  // Handle typing animation for output text
  useEffect(() => {
    if (response === null) return;

    let index = 0;
    const intervalId = setInterval(() => {
      setDisplayText(text => text + response.charAt(index));
      index++;
      if (index === response.length) {
        clearInterval(intervalId);
      }
    }, 10);

    return () => clearInterval(intervalId);
  }, [response]);

  // Set mSOL and SOL bank information when the user accounts context is updated
  useEffect(() => {
    setSOLBank(
      extendedBankInfos.find((bank) => bank.tokenName === "SOL")
    )
    setmSOLBank(
      extendedBankInfos.find((bank) => bank.tokenName === "mSOL")
    )
  }, [extendedBankInfos])

  
  // This is a callback function that is used to handle the "Superstake" action.
  // It first checks that all necessary values are present to proceed with the superstaking action.
  // If a valid amount is not entered, an error message will be displayed.
  // Otherwise, it calls the superStake function with the necessary parameters and catches any errors.
  // Once the superstaking action is complete, it resets the superStakeOrWithdrawAmount state variable to 0.
  // Then, it attempts to reload the banks using the reloadBanks function and displays an error message if necessary.
  const actionSuperStake = useCallback(async (superStakeOrWithdrawAmount: number ) => {
    if (mfiClient === null || !mSOLBank || !solBank || !selectedAccount) return;
    let marginfiAccount = selectedAccount;
    if (superStakeOrWithdrawAmount <= 0) {
      setResponse('Please enter a valid amount above 0.');
      return;
    }

    try {
      await superStake(
        marginfiAccount,
        connection,
        wallet,
        superStakeOrWithdrawAmount,
        mSOLBank,
        solBank,
        reloadBanks
      )
    } catch (error: any) {
      setResponse("I'm sorry, there was an error. Please try again.")
    }

    try {
      await reloadBanks();
    } catch (error: any) {
      setResponse("There was an error reloading banks. Please refresh the page.")
    }

  }, [mfiClient, mSOLBank, solBank, selectedAccount, reloadBanks])

  // This is a callback function that is used to handle the "Unstake" action.
  // It first checks that all necessary values are present to proceed with the unstaking action.
  // If a valid amount is not entered, an error message will be displayed.
  // Otherwise, it calls the withdrawSuperstake function with the necessary parameters and catches any errors.
  // Once the unstaking action is complete, it resets the superStakeOrWithdrawAmount state variable to 0.
  // Then, it attempts to reload the banks using the reloadBanks function and displays an error message if necessary.
  const actionUnstake = useCallback(async (superStakeOrWithdrawAmount: number) => {
    if (mfiClient === null || !mSOLBank || !solBank || !selectedAccount) return;
    let marginfiAccount = selectedAccount;
    if (superStakeOrWithdrawAmount <= 0) {
      setResponse('Please enter a valid amount above 0.');
      return;
    }

    try {
      await withdrawSuperstake(
        marginfiAccount,
        connection,
        wallet,
        superStakeOrWithdrawAmount,
        mSOLBank,
        solBank,
        reloadBanks,
        jupiter,
      )
    } catch (error: any) {
      setResponse("I'm sorry, there was an error. Please try again.")
    }

    try {
      await reloadBanks();
    } catch (error: any) {
      setResponse("There was an error reloading banks. Please refresh the page.")
    }

  }, [mfiClient, mSOLBank, solBank, selectedAccount, reloadBanks])

  useEffect(() => {

    const regex = /It sounds like you want to (\w+) (\d+) mSOL.*/;
    const match = response.match(regex);

    if (match) {
      const [fullMatch, action, amount] = match;

      if (action === 'superstake') {
        actionSuperStake(
          parseFloat(amount)
        )
      }

      if (action === 'unstake') {
        actionUnstake(
          parseFloat(amount)
        )
      }

      setDisplayText(`${action} ${amount} |`)
    }
  },[response]);

  return (
    <div
      className="top-0 w-full h-full absolute flex flex-col justify-center items-center gap-5 max-w-7xl"
    >
      <div className="text-5xl flex justify-between w-3/5" style={{ fontWeight: 500 }}>
        <div>superstake</div>
        <div className="text-[#9BEB8E]">8000%</div>
      </div>
      <form onSubmit={handleSubmit} className="w-3/5">
        <TextField
          fullWidth
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          defaultValue="Tell me what to do..."
          InputProps={{
            sx: {
              backgroundColor: '#181C1F',
              color: 'rgb(161, 161, 161)',
              fontSize: '1rem',
              width: '100%',
              fontFamily: 'Aeonik Pro',
            },
          }}
        />
      </form>
      <div className="min-h-[100px] flex w-3/5" style={{ fontFamily: "monospace" }}>
        {
          displayText &&
          <div>
              {
                displayText
              }
          </div>
        }
      </div>
    </div>
  )
}

export default AiUI;
