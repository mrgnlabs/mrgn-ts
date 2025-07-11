import React from "react";

import Link from "next/link";
import Image from "next/image";

import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
  VersionedTransaction,
  TransactionMessage,
  Connection,
} from "@solana/web3.js";
import { IconCheck, IconX, IconWallet } from "@tabler/icons-react";

import {
  shortenAddress,
  numeralFormatter,
  WSOL_MINT,
  getAssociatedTokenAddressSync,
  createTransferCheckedInstruction,
  createAssociatedTokenAccountInstruction,
} from "@mrgnlabs/mrgn-common";

import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { TokenWalletData, useWallet } from "~/components/wallet-v2";

import { Loader } from "~/components/ui/loader";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Input } from "~/components/ui/input";

import { confirmTransaction } from "@mrgnlabs/marginfi-client-v2";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

type WalletSendProps = {
  connection: Connection;
  walletTokens: TokenWalletData[];
  activeToken: TokenWalletData;
  onSendMore?: () => void;
  onBack?: () => void;
  onRetry?: () => void;
  onCancel?: () => void;
  onComplete?: () => void;
};

enum SendingState {
  DEFAULT = "default",
  SENDING = "sending",
  SUCCESS = "success",
  FAILED = "failed",
}

export const WalletSend = ({
  connection,
  walletTokens,
  activeToken,
  onSendMore,
  onBack,
  onRetry,
  onCancel,
  onComplete,
}: WalletSendProps) => {
  const { wallet } = useWallet();
  const [amount, setAmount] = React.useState(0);
  const [amountRaw, setAmountRaw] = React.useState("");
  const [sendingState, setSendingState] = React.useState<SendingState>(SendingState.DEFAULT);
  const [sendSig, setSendSig] = React.useState<string>("");
  const toAddressRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const maxAmount = React.useMemo(() => {
    if (!activeToken) return 0;
    return activeToken.value;
  }, [activeToken]);

  const formatAmount = React.useCallback(
    (newAmount: string, decimals: number) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = decimals;

      if (
        (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
        !newAmount.substring(0, newAmount.length - 1).includes(".")
      ) {
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).concat(".");
      } else {
        const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
        if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
        decimalPart = isDecimalPartInvalid
          ? ""
          : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
      }

      if (amount > maxAmount) {
        return numberFormater.format(maxAmount);
      } else {
        return formattedAmount;
      }
    },
    [numberFormater, maxAmount]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      if (!activeToken) return;
      setAmountRaw(formatAmount(newAmount, activeToken.decimals));
      setAmount(Number.parseFloat(newAmount.replace(/,/g, "")) || 0);
    },
    [activeToken, formatAmount]
  );

  const handleTransfer = React.useCallback(
    async (recipientAddress: string, token: TokenWalletData, amount: number) => {
      if (!wallet.publicKey) {
        console.log("Wallet is not connected");
        return;
      }

      const multiStepToast = toastManager.createMultiStepToast(`Transfer ${token.symbol}`, [
        { label: `Sending ${amount} ${token.symbol} to ${shortenAddress(recipientAddress)}` },
      ]);

      const tokenMint = token.mint;
      const tokenDecimals = token.decimals;

      const senderWalletAddress = wallet.publicKey;
      const recipientPublicKey = new PublicKey(recipientAddress);

      try {
        const instructions = [];

        if (tokenMint.equals(WSOL_MINT)) {
          instructions.push(
            SystemProgram.transfer({
              fromPubkey: senderWalletAddress,
              toPubkey: recipientPublicKey,
              lamports: Math.floor(amount * LAMPORTS_PER_SOL),
            })
          );
        } else {
          const senderTokenAccountAddress = getAssociatedTokenAddressSync(tokenMint, senderWalletAddress);
          const recipientTokenAccountAddress = getAssociatedTokenAddressSync(tokenMint, recipientPublicKey);
          const recipientAta = await connection.getAccountInfo(recipientTokenAccountAddress);

          if (!recipientAta) {
            instructions.push(
              createAssociatedTokenAccountInstruction(
                senderWalletAddress,
                recipientTokenAccountAddress,
                recipientPublicKey,
                tokenMint
              )
            );
          }

          instructions.push(
            createTransferCheckedInstruction(
              senderTokenAccountAddress,
              tokenMint,
              recipientTokenAccountAddress,
              senderWalletAddress,
              Math.floor(amount * Math.pow(10, tokenDecimals)),
              tokenDecimals
            )
          );
        }

        multiStepToast.start();
        setSendingState(SendingState.SENDING);

        const {
          value: { blockhash, lastValidBlockHeight },
        } = await connection.getLatestBlockhashAndContext();

        const message = new TransactionMessage({
          payerKey: senderWalletAddress,
          recentBlockhash: blockhash,
          instructions: instructions.map((instruction) => ({
            programId: instruction.programId,
            keys: instruction.keys,
            data: instruction.data,
          })),
        });

        const versionedTx = new VersionedTransaction(message.compileToV0Message([]));

        const signedTx = await wallet.signTransaction(versionedTx);
        const signature = await connection.sendTransaction(signedTx);
        await confirmTransaction(connection, signature, "confirmed");
        // await connection.confirmTransaction(
        //   {
        //     blockhash,
        //     lastValidBlockHeight,
        //     signature: signature,
        //   },
        //   "confirmed"
        // );
        multiStepToast.successAndNext();
        setSendingState(SendingState.SUCCESS);
        setSendSig(signature);
        capture("send_token", {
          token: token.symbol,
          amount,
          recipient: recipientAddress,
          wallet: wallet.publicKey,
        });
        onComplete && onComplete();
      } catch (error: any) {
        multiStepToast.setFailed(error.message || "Transaction failed, please try again");
        setSendingState(SendingState.FAILED);
        console.error("Transaction failed:", error);
      }
    },
    [wallet, connection, onComplete]
  );

  if (sendingState === SendingState.SENDING) {
    return (
      <div className="mt-8 flex flex-col items-center gap-4">
        <Loader label="Sending..." className="text-xl text-primary font-medium" iconSize={48} />
        <p className="text-muted-foreground">
          {amountRaw} {activeToken.symbol}{" "}
          {toAddressRef.current && toAddressRef.current.value && `to ${shortenAddress(toAddressRef.current.value)}`}
        </p>
      </div>
    );
  } else if (sendingState === SendingState.SUCCESS) {
    return (
      <div className="mt-8 flex flex-col items-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full w-12 h-12 border-2 border-chartreuse flex items-center justify-center">
            <IconCheck size={32} className="text-chartreuse" />
          </div>
          <p className="text-muted-foreground">
            {amountRaw} {activeToken.symbol} was succesfully sent
            {toAddressRef.current && toAddressRef.current.value && `to ${shortenAddress(toAddressRef.current.value)}`}
          </p>
        </div>
        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onSendMore && onSendMore();
              setSendingState(SendingState.DEFAULT);
              setAmountRaw("");
            }}
          >
            Send more
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              onBack && onBack();
              setSendingState(SendingState.DEFAULT);
              setAmountRaw("");
            }}
          >
            Back to tokens
          </Button>
        </div>
        <Link
          href={`https://explorer.solana.com/tx/${sendSig}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm border-b border-muted-foreground transition-colors hover:border-transparent"
        >
          View transaction
        </Link>
      </div>
    );
  } else if (sendingState === SendingState.FAILED) {
    return (
      <div className="mt-8 flex flex-col items-center gap-4 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="rounded-full w-12 h-12 border-2 border-destructive-foreground flex items-center justify-center">
            <IconX size={32} className="text-destructive-foreground" />
          </div>
          <p className="text-muted-foreground">There was an error sending the transaction. Please try again.</p>
        </div>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            setSendingState(SendingState.DEFAULT);
            onRetry && onRetry();
          }}
        >
          Retry
        </Button>
      </div>
    );
  } else if (sendingState === SendingState.DEFAULT) {
    return (
      <div className="gap-6 text-center flex flex-col items-center">
        <div className="gap-2 text-center flex flex-col items-center">
          <Image src={activeToken.image} alt={activeToken.symbol} width={60} height={60} className="rounded-full" />
          <div className="space-y-0">
            <h2 className="flex items-center gap-2 font-medium text-xl">Send {activeToken.symbol}</h2>
          </div>
        </div>
        <form
          className="w-4/5 flex flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (!toAddressRef.current || !activeToken) return;
            handleTransfer(toAddressRef.current.value, activeToken, amount);
          }}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 justify-end text-sm">
              <IconWallet size={16} />
              {activeToken.value < 0.01 ? "< 0.01" : numeralFormatter(activeToken.value) + " " + activeToken.symbol}
              <button
                className={cn(
                  "text-chartreuse border-b leading-none border-transparent transition-colors",
                  maxAmount > 0 && "cursor-pointer hover:border-chartreuse"
                )}
                onClick={(e) => {
                  e.preventDefault();
                  handleInputChange(numberFormater.format(maxAmount));
                }}
                disabled={maxAmount === 0}
              >
                MAX
              </button>
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="sendAmount" className="relative">
                <Input
                  type="text"
                  id="sendAmount"
                  required
                  placeholder="Amount"
                  value={amountRaw}
                  onChange={(e) => handleInputChange(e.target.value)}
                />
              </Label>
              <Label htmlFor="toAddress">
                <Input
                  ref={toAddressRef}
                  type="text"
                  id="sendToAddress"
                  required
                  placeholder="Recipient's Solana address"
                />
              </Label>
            </div>
          </div>
          <div className="flex gap-2 w-full">
            <Button type="submit" className="w-full gap-1.5">
              Send
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onCancel && onCancel();
                setAmountRaw("");
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    );
  } else {
    return null;
  }
};
WalletSend.displayName = "WalletSend";
