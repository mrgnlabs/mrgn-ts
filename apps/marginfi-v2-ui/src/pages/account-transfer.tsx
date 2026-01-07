import React from "react";

import {
  useMarginfiAccountAddresses,
  useWrappedMarginfiAccount,
  useMarginfiClient,
  useSetSelectedAccountKey,
  useRefreshUserData,
} from "@mrgnlabs/mrgn-state";
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";

import { useWallet } from "~/components";
import { useConnection } from "~/hooks/use-connection";
import { useUiStore } from "~/store";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import { WalletAuthAccounts } from "~/components/wallet-v2";
import { Loader } from "~/components/ui/loader";

export default function AccountTransferPage() {
  const [hasError, setHasError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const { connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { wrappedAccount: selectedAccount, isLoading: isLoadingSelectedAccount } = useWrappedMarginfiAccount(wallet);
  const { data: marginfiAccounts, isLoading: isLoadingMarginfiAccounts } = useMarginfiAccountAddresses();
  const { marginfiClient, isLoading: isLoadingMarginfiClient } = useMarginfiClient(wallet);
  const refreshUserData = useRefreshUserData();
  const [priorityFees, broadcastType, accountLabels] = useUiStore((state) => [
    state.priorityFees,
    state.broadcastType,
    state.accountLabels,
  ]);

  const setSelectedKey = useSetSelectedAccountKey();

  const setSelectedAccount = React.useCallback(
    (account: PublicKey) => {
      setSelectedKey(account.toBase58());
    },
    [setSelectedKey]
  );

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedAccount) {
        setHasError("Marginfi account not found");
        return;
      }

      const formData = new FormData(e.target as HTMLFormElement);
      const newAuthority = formData.get("newAuthority") as string;
      const privateKey = (formData.get("privateKey") as string)?.trim() || "";
      let newAuthorityPk: PublicKey;

      // Parse private key input - supports base58, JSON array, or empty (use connected wallet)
      let payerPubkey: PublicKey;
      let payerKeypair: Keypair | null = null;

      if (privateKey === "") {
        // No fee payer provided - use connected wallet
        if (!wallet.publicKey) {
          setHasError("Wallet not connected");
          return;
        }
        payerPubkey = wallet.publicKey;
      } else {
        // Fee payer provided - parse as base58 or JSON array
        try {
          // Try parsing as base58 first (most common format)
          if (!privateKey.startsWith("[")) {
            const secretKey = bs58.decode(privateKey);
            payerKeypair = Keypair.fromSecretKey(secretKey);
            payerPubkey = payerKeypair.publicKey;
          } else {
            // Parse as JSON array
            const keyArray = JSON.parse(privateKey);
            if (!Array.isArray(keyArray) || !keyArray.every((n: unknown) => typeof n === "number")) {
              throw new Error("Private key must be a JSON array of numbers");
            }
            const secretKey = new Uint8Array(keyArray);
            payerKeypair = Keypair.fromSecretKey(secretKey);
            payerPubkey = payerKeypair.publicKey;
          }
        } catch (err) {
          setHasError(
            "Invalid private key format. Provide either a base58-encoded private key or JSON array (e.g. [231, 222, ...])"
          );
          return;
        }
      }

      try {
        newAuthorityPk = new PublicKey(newAuthority);
      } catch (error) {
        setHasError("Invalid wallet address");
        return;
      }

      const newAccount = Keypair.generate();
      const newAccountPk = newAccount.publicKey;

      try {
        setIsLoading(true);

        // Create the transaction
        const transaction = await selectedAccount.makeAccountTransferToNewAccountTx(
          newAccountPk,
          newAuthorityPk,
          payerPubkey
        );

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = payerPubkey;

        // Convert to versioned transaction
        const message = new TransactionMessage({
          payerKey: payerPubkey,
          recentBlockhash: blockhash,
          instructions: transaction.instructions,
        });
        const versionedTransaction = new VersionedTransaction(message.compileToV0Message([]));

        // Sign the transaction with the new account keypair and fee payer (if separate)
        versionedTransaction.sign([newAccount]);
        if (payerKeypair) {
          versionedTransaction.sign([payerKeypair]);
        }

        const simulateResult = await connection.simulateTransaction(versionedTransaction, { sigVerify: false });
        console.log("simulateResult: ", simulateResult);
        const signedTransaction = await wallet.signTransaction(versionedTransaction);

        // Send the transaction
        const signature = await connection.sendTransaction(signedTransaction, {
          skipPreflight: true,
        });

        console.log(signature);

        setIsSuccess(true);

        setTimeout(() => {
          refreshUserData();
        }, 2000);
      } catch (error) {
        setHasError(error instanceof Error ? error.message : "Error transferring account");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount, wallet, connection, refreshUserData]
  );

  if (!connected) {
    return <div>Please connect your wallet</div>;
  }

  if (isLoadingSelectedAccount) {
    return <Loader label="Loading account..." />;
  }

  return (
    <div className="w-full max-w-7xl mx-auto text-center flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-medium">Account Transfer</h1>
        <p className="text-muted-foreground">
          Transfer your marginfi account to a new authority.
          <br /> <strong className="font-medium">This action is irreversible, proceed with caution.</strong>
        </p>
        {isSuccess && <p className="text-mrgn-success">Account transferred successfully!</p>}
      </div>
      <form className="w-full max-w-md mx-auto flex flex-col gap-4" onSubmit={handleSubmit}>
        {hasError && <p className="text-mrgn-error text-sm">{hasError}</p>}

        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Select Account</label>
            <WalletAuthAccounts
              mfiClient={marginfiClient}
              connection={marginfiClient?.provider.connection ?? null}
              marginfiAccounts={marginfiAccounts ?? []}
              selectedAccount={selectedAccount}
              setSelectedAccount={setSelectedAccount}
              closeOnSwitch={true}
              popoverContentAlign="start"
              processOpts={{
                ...priorityFees,
                broadcastType,
              }}
              accountLabels={accountLabels}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">New Authority Address</label>
            <Input type="text" placeholder="New authority wallet address" required name="newAuthority" />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium">Fee Payer (Optional)</label>
            <Input
              type="text"
              placeholder="Base58 private key or JSON array (e.g. [231, 222, ...])"
              name="privateKey"
            />
            <p className="text-xs text-muted-foreground">
              Only required if the connected wallet is no longer owned by the system program and it cannot pay
              transaction fees
            </p>
          </div>
        </div>

        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Transferring..." : "Transfer Account"}
        </Button>
      </form>
    </div>
  );
}
