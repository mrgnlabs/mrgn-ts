import React, { FC, useCallback, useMemo, useState } from "react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import BN from "bn.js";
import { shortenAddress, uiToNative } from "@mrgnlabs/mrgn-common";
import { useProgram, useTokenAccounts } from "~/context";
import { ProAction, ProInputBox } from "~/pages/earn";
import { useWallet } from "@solana/wallet-adapter-react";
import { groupedNumberFormatterDyn, percentFormatterDyn } from "~/utils/formatters";
import { calculateInterestFromApy, computeGuaranteedApy } from "@mrgnlabs/lip-client/src/utils";
import { floor } from "~/utils";
import { createAssociatedTokenAccountIdempotentInstruction, createSyncNativeInstruction, NATIVE_MINT } from "@mrgnlabs/mrgn-common/src/spl";

interface CampaignWizardProps {
  selectedAsset: string;
}

const CampaignWizard: FC<CampaignWizardProps> = ({ selectedAsset }) => {
  const [guaranteedApy, setGuaranteedApy] = useState(0);
  const [lockupPeriodInDays, setLockupPeriodInDays] = useState(0);
  const [depositCapacity, setDepositCapacity] = useState(0);

  const { tokenAccountMap } = useTokenAccounts();
  const wallet = useWallet();
  const { lipClient, mfiClient, reload: reloadLipClient } = useProgram();

  const assetBank = useMemo(() => {
    if (!mfiClient || !selectedAsset) return null;
    const banks = mfiClient.group.banks;
    return [...banks.values()].find((b) => b.label === selectedAsset);
  }, [mfiClient, selectedAsset]);

  const tokenBalance = useMemo(() => {
    if (!assetBank) return 0;
    return tokenAccountMap.get(assetBank.mint.toBase58())?.balance || 0;
  }, [tokenAccountMap, assetBank]);

  const maxRewards = useMemo(() => {
    if (!assetBank) return 0;
    const lockupPeriodInYears = lockupPeriodInDays / 365;
    return floor(
      calculateInterestFromApy(depositCapacity, lockupPeriodInYears, guaranteedApy),
      assetBank.mintDecimals
    );
  }, [assetBank, lockupPeriodInDays, depositCapacity, guaranteedApy]);

  const contractInputs = useMemo(() => {
    if (!assetBank)
      return {
        lockupPeriod: new BN(0),
        maxDeposits: new BN(0),
        maxRewards: new BN(0),
      };

    const lockupPeriodInSeconds = (lockupPeriodInDays) * 24 * 60 * 60;
    const maxRewardsNative = uiToNative(maxRewards, assetBank.mintDecimals);
    const maxDepositsNative = uiToNative(depositCapacity, assetBank.mintDecimals);
    return {
      lockupPeriod: new BN(lockupPeriodInSeconds),
      maxDeposits: maxDepositsNative,
      maxRewards: maxRewardsNative,
    };
  }, [assetBank, lockupPeriodInDays, depositCapacity]);

  const createCampaign = useCallback(async () => {
    if (mfiClient === null || !lipClient || !selectedAsset || !assetBank || maxRewards === 0) return;

    const campaignKeypair = Keypair.generate();
    console.log("creating campaign", campaignKeypair.publicKey.toBase58());
    const userTokenAtaPk = await associatedAddress({
      mint: assetBank.mint,
      owner: lipClient.wallet.publicKey,
    });

    const tx = new Transaction();

    if (assetBank.mint.equals(NATIVE_MINT)) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          lipClient.wallet.publicKey,
          userTokenAtaPk,
          lipClient.wallet.publicKey,
          NATIVE_MINT,
        ),
        SystemProgram.transfer({ fromPubkey: lipClient.wallet.publicKey, toPubkey: userTokenAtaPk, lamports: contractInputs.maxRewards.toNumber() }),
        createSyncNativeInstruction(userTokenAtaPk),
      );
    }

    tx.add(
      await lipClient.program.methods
        .createCampaign(contractInputs.lockupPeriod, contractInputs.maxDeposits, contractInputs.maxRewards)
        .accounts({
          campaign: campaignKeypair.publicKey,
          admin: lipClient.wallet.publicKey,
          fundingAccount: userTokenAtaPk,
          marginfiBank: assetBank.publicKey,
          assetMint: assetBank.mint,
        })
        .instruction()
    );


    const sig = await lipClient.processTransaction(tx, [campaignKeypair], { skipPreflight: true });
    console.log("campaign creation tx", sig);
    await reloadLipClient();
  }, [
    assetBank,
    contractInputs.lockupPeriod,
    contractInputs.maxDeposits,
    contractInputs.maxRewards,
    lipClient,
    maxRewards,
    mfiClient,
    reloadLipClient,
    selectedAsset,
  ]);

  return (
    <div className="flex flex-col justify-center gap-3 p-5 bg-black z-20">
      <div>
        Guaranteed Apy percentage:
        <ProInputBox
          value={guaranteedApy * 100}
          setValue={(value) => setGuaranteedApy(value / 100)}
          loadingSafetyCheck={() => { }}
          maxDecimals={2}
          disabled={!wallet.connected}
        />
      </div>
      <div>
        Lock-up period (days):
        <ProInputBox
          value={lockupPeriodInDays}
          setValue={setLockupPeriodInDays}
          loadingSafetyCheck={() => { }}
          maxDecimals={3}
          disabled={!wallet.connected}
        />
      </div>
      <div>
        Deposit capacity (in asset unit):
        <ProInputBox
          value={depositCapacity}
          setValue={setDepositCapacity}
          loadingSafetyCheck={() => { }}
          maxDecimals={2}
          disabled={!wallet.connected}
        />
      </div>
      <div>
        <b style={{ color: "#3CAB5F" }}>User info:</b>
        <div className="flex justify-between">
          token balance:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(tokenBalance)} {selectedAsset}
          </span>
        </div>
      </div>
      --------------------------
      <div>
        <b style={{ color: "#3CAB5F" }}>Summary:</b>
        <div className="flex justify-between">
          Guaranteed APY:{" "}
          <span style={{ color: "yellow", fontWeight: "bold" }}>{percentFormatterDyn.format(guaranteedApy)}</span>
        </div>
        <div className="flex justify-between">
          Lock-up period: <span style={{ color: "yellow", fontWeight: "bold" }}>{lockupPeriodInDays} days</span>
        </div>
        <div className="flex justify-between">
          Deposit capacity:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(depositCapacity)} {selectedAsset}
          </span>
        </div>
        <div className="flex justify-between">
          Max rewards:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(maxRewards)} {selectedAsset}
          </span>
        </div>
        <div className="flex justify-between">
          Effective rate:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {assetBank
              ? percentFormatterDyn.format(
                computeGuaranteedApy(
                  contractInputs.lockupPeriod,
                  contractInputs.maxDeposits,
                  contractInputs.maxRewards,
                  assetBank
                )
              )
              : 0}
          </span>
        </div>
      </div>
      --------------------------
      <div>
        <b style={{ color: "#3CAB5F" }}>Contract inputs:</b>
        <div className="flex justify-between">
          Env: <span style={{ color: "yellow", fontWeight: "bold" }}>{lipClient?.config.environment || "none"}</span>
        </div>
        <div className="flex justify-between">
          Mint:{" "}
          <span style={{ color: "yellow", fontWeight: "bold" }}>
            {assetBank ? shortenAddress(assetBank.mint) : "none"}
          </span>
        </div>
        <div className="flex justify-between">
          Mfi program:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {mfiClient ? shortenAddress(mfiClient.program.programId.toBase58()) : "none"}
          </span>
        </div>
        <div className="flex justify-between">
          LIP program:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {lipClient ? shortenAddress(lipClient.program.programId.toBase58()) : "none"}
          </span>
        </div>
        <div className="flex justify-between">
          lockup_period:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(contractInputs.lockupPeriod.toNumber())}
          </span>
        </div>
        <div className="flex justify-between">
          max_deposit:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(contractInputs.maxDeposits.toNumber())}
          </span>
        </div>
        <div className="flex justify-between">
          max_rewards:{" "}
          <span
            style={{
              color: "yellow",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(contractInputs.maxRewards.toNumber())}
          </span>
        </div>
      </div>
      <ProAction
        onClick={createCampaign}
        disabled={mfiClient === null || !lipClient || !selectedAsset || maxRewards === 0}
      >
        Create campaign
      </ProAction>
    </div>
  );
};

export { CampaignWizard };
