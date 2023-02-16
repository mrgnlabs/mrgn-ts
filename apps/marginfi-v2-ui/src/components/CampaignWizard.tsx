import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
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
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
} from "@mrgnlabs/mrgn-common/src/spl";
import { MenuItem, Select, SelectChangeEvent } from "@mui/material";
import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";

interface CampaignWizardProps {}

const CampaignWizard: FC<CampaignWizardProps> = () => {
  const [guaranteedApy, setGuaranteedApy] = useState(0);
  const [lockupPeriodInDays, setLockupPeriodInDays] = useState(0);
  const [depositCapacity, setDepositCapacity] = useState(0);
  const [campaignBank, setCampaignBank] = useState<Bank | null>(null);

  const { tokenAccountMap } = useTokenAccounts();
  const wallet = useWallet();
  const { lipClient, mfiClient, reload: reloadLipClient } = useProgram();

  const availableBanks = useMemo(() => {
    if (!mfiClient) return [];
    return [...mfiClient.group.banks.values()];
  }, [mfiClient]);

  useEffect(() => {
    if (availableBanks.length === 0 || campaignBank !== null) return;
    setCampaignBank(availableBanks[0]);
  }, [availableBanks, campaignBank]);

  const tokenBalance = useMemo(() => {
    if (!campaignBank) return 0;
    return tokenAccountMap.get(campaignBank.mint.toBase58())?.balance || 0;
  }, [tokenAccountMap, campaignBank]);

  const maxRewards = useMemo(() => {
    if (!campaignBank) return 0;
    const lockupPeriodInYears = lockupPeriodInDays / 365;
    return floor(
      calculateInterestFromApy(depositCapacity, lockupPeriodInYears, guaranteedApy),
      campaignBank.mintDecimals
    );
  }, [campaignBank, lockupPeriodInDays, depositCapacity, guaranteedApy]);

  const contractInputs = useMemo(() => {
    if (!campaignBank)
      return {
        lockupPeriod: new BN(0),
        maxDeposits: new BN(0),
        maxRewards: new BN(0),
      };

    const lockupPeriodInSeconds = lockupPeriodInDays * 24 * 60 * 60;
    const maxRewardsNative = uiToNative(maxRewards, campaignBank.mintDecimals);
    const maxDepositsNative = uiToNative(depositCapacity, campaignBank.mintDecimals);
    return {
      lockupPeriod: new BN(lockupPeriodInSeconds),
      maxDeposits: maxDepositsNative,
      maxRewards: maxRewardsNative,
    };
  }, [campaignBank, lockupPeriodInDays, maxRewards, depositCapacity]);

  const createCampaign = useCallback(async () => {
    if (mfiClient === null || !lipClient || !campaignBank || maxRewards === 0) return;

    const campaignKeypair = Keypair.generate();
    console.log("creating campaign", campaignKeypair.publicKey.toBase58());
    const userTokenAtaPk = await associatedAddress({
      mint: campaignBank.mint,
      owner: lipClient.wallet.publicKey,
    });

    const tx = new Transaction();

    if (campaignBank.mint.equals(NATIVE_MINT)) {
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          lipClient.wallet.publicKey,
          userTokenAtaPk,
          lipClient.wallet.publicKey,
          NATIVE_MINT
        ),
        SystemProgram.transfer({
          fromPubkey: lipClient.wallet.publicKey,
          toPubkey: userTokenAtaPk,
          lamports: contractInputs.maxRewards.toNumber(),
        }),
        createSyncNativeInstruction(userTokenAtaPk)
      );
    }

    tx.add(
      await lipClient.program.methods
        .createCampaign(contractInputs.lockupPeriod, contractInputs.maxDeposits, contractInputs.maxRewards)
        .accounts({
          campaign: campaignKeypair.publicKey,
          admin: lipClient.wallet.publicKey,
          fundingAccount: userTokenAtaPk,
          marginfiBank: campaignBank.publicKey,
          assetMint: campaignBank.mint,
        })
        .instruction()
    );

    const sig = await lipClient.processTransaction(tx, [campaignKeypair], { skipPreflight: true });
    console.log("campaign creation tx", sig);
    await reloadLipClient();
  }, [
    campaignBank,
    contractInputs.lockupPeriod,
    contractInputs.maxDeposits,
    contractInputs.maxRewards,
    lipClient,
    maxRewards,
    mfiClient,
    reloadLipClient,
  ]);

  if (!campaignBank) return null;

  return (
    <div className="flex flex-col justify-center gap-3 p-5 bg-black z-20">
      <Select
        className="bg-gray-600"
        labelId="campaign-bank-label"
        id="campaign-bank-select"
        variant="outlined"
        classes={{ standard: "test-white" }}
        value={campaignBank.publicKey.toBase58()}
        onChange={(event: SelectChangeEvent<string>) => {
          const bank = availableBanks.find((b) => b.publicKey.toBase58() === event.target.value);
          if (!bank) throw new Error("Bank not found");
          setCampaignBank(bank);
        }}
      >
        {availableBanks.map((b) => (
          <MenuItem key={b.publicKey.toBase58()} value={b.publicKey.toBase58()}>
            {b.label} - {shortenAddress(b.publicKey)}
          </MenuItem>
        ))}
      </Select>
      <div>
        Guaranteed Apy percentage:
        <ProInputBox
          value={guaranteedApy * 100}
          setValue={(value) => setGuaranteedApy(value / 100)}
          loadingSafetyCheck={() => {}}
          maxDecimals={2}
          disabled={!wallet.connected}
        />
      </div>
      <div>
        Lock-up period (days):
        <ProInputBox
          value={lockupPeriodInDays}
          setValue={setLockupPeriodInDays}
          loadingSafetyCheck={() => {}}
          maxDecimals={3}
          disabled={!wallet.connected}
        />
      </div>
      <div>
        Deposit capacity (in asset unit):
        <ProInputBox
          value={depositCapacity}
          setValue={setDepositCapacity}
          loadingSafetyCheck={() => {}}
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
            {groupedNumberFormatterDyn.format(tokenBalance)} {campaignBank?.label || "none"}
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
            {groupedNumberFormatterDyn.format(depositCapacity)} {campaignBank?.label || "none"}
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
            {groupedNumberFormatterDyn.format(maxRewards)} {campaignBank?.label || "none"}
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
            {campaignBank
              ? percentFormatterDyn.format(
                  computeGuaranteedApy(
                    contractInputs.lockupPeriod,
                    contractInputs.maxDeposits,
                    contractInputs.maxRewards,
                    campaignBank
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
            {campaignBank ? shortenAddress(campaignBank.mint) : "none"}
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
        disabled={mfiClient === null || !lipClient || !campaignBank || maxRewards === 0}
      >
        Create campaign
      </ProAction>
    </div>
  );
};

export { CampaignWizard };
