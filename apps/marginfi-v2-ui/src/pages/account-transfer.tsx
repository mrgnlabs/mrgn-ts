import React from "react";

import { useWrappedMarginfiAccount } from "@mrgnlabs/mrgn-state";
import { Keypair, PublicKey, TransactionMessage, VersionedTransaction } from "@solana/web3.js";

import { useWallet } from "~/components";
import { useUiStore } from "~/store";
import { useConnection } from "~/hooks/use-connection";

import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";

export default function AccountTransferPage() {
  const [hasError, setHasError] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const { connected, wallet } = useWallet();
  const { connection } = useConnection();
  const { wrappedAccount: selectedAccount, isLoading: isLoadingSelectedAccount } = useWrappedMarginfiAccount(wallet);
  const { priorityFees, broadcastType } = useUiStore((state) => ({
    priorityFees: state.priorityFees,
    broadcastType: state.broadcastType,
  }));

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedAccount) {
        setHasError("Marginfi account not found");
        return;
      }

      const formData = new FormData(e.target as HTMLFormElement);
      const newAuthority = formData.get("newAuthority") as string;
      let newAuthorityPk: PublicKey;

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
        const transaction = await selectedAccount.makeAccountTransferToNewAccountTx(newAccountPk, newAuthorityPk);

        // Get the latest blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = wallet.publicKey;

        // Convert to versioned transaction
        const message = new TransactionMessage({
          payerKey: wallet.publicKey,
          recentBlockhash: blockhash,
          instructions: transaction.instructions,
        });
        const versionedTransaction = new VersionedTransaction(message.compileToV0Message([]));

        // Sign the transaction with both the wallet and the new account keypair
        versionedTransaction.sign([newAccount]);
        const signedTransaction = await wallet.signTransaction(versionedTransaction);

        // Send the transaction
        const signature = await connection.sendTransaction(signedTransaction, {
          skipPreflight: true,
        });

        // Wait for confirmation
        // await connection.confirmTransaction(signature, "confirmed");

        console.log("Transfer signature:", signature);
        setIsSuccess(true);
      } catch (error) {
        setHasError(error instanceof Error ? error.message : "Error transferring account");
      } finally {
        setIsLoading(false);
      }
    },
    [selectedAccount, wallet, connection]
  );

  if (!connected) {
    return <div>Please connect your wallet</div>;
  }

  if (isLoadingSelectedAccount) {
    return <div>Loading account...</div>;
  }

  return (
    <div className="w-full max-w-7xl mx-auto text-center flex flex-col gap-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-4xl font-medium">Account Transfer</h1>
        <p className="text-muted-foreground">
          Transfer your marginfi account to a new authority.
          <br /> <strong className="font-medium">This action is irreversible, proceed with caution.</strong>
        </p>
        {isSuccess && <p className="text-green-500">Account transferred successfully</p>}
      </div>
      <form className="w-full max-w-md mx-auto flex flex-col gap-4" onSubmit={handleSubmit}>
        {hasError && <p className="text-destructive-foreground text-sm">{hasError}</p>}
        <Input type="text" placeholder="New authority wallet address" required name="newAuthority" />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Transferring..." : "Transfer Account"}
        </Button>
      </form>
    </div>
  );
}
