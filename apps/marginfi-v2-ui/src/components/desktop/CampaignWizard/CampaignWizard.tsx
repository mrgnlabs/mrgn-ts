import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import {
  uiToNative,
  floor,
  groupedNumberFormatterDyn,
  percentFormatterDyn,
  calculateInterestFromApy,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  NATIVE_MINT,
  getAssociatedTokenAddressSync,
} from "@mrgnlabs/mrgn-common";
import { useLipClient } from "~/context";
import { MenuItem, Select, TextField } from "@mui/material";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import Image from "next/image";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import { useMrgnlendStore } from "~/store";
import { computeGuaranteedApy } from "@mrgnlabs/lip-client";
import { EarnAction } from "~/components/desktop/Earn";
import { useWalletContext } from "~/hooks/useWalletContext";

interface CampaignWizardInputBox {
  value: number;
  setValue: (value: number) => void;
  loadingSafetyCheck: () => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

const CampaignWizardInputBox: FC<CampaignWizardInputBox> = ({
  value,
  setValue,
  loadingSafetyCheck,
  maxValue,
  maxDecimals,
  disabled,
}) => {
  const onChange = useCallback(
    (event: NumberFormatValues) => {
      const updatedAmountStr = event.value;
      if (updatedAmountStr !== "" && !/^\d*\.?\d*$/.test(updatedAmountStr)) return;

      const updatedAmount = Number(updatedAmountStr);
      if (maxValue !== undefined && updatedAmount > maxValue) {
        loadingSafetyCheck();
        setValue(maxValue);
        return;
      }

      loadingSafetyCheck();
      setValue(updatedAmount);
    },
    [maxValue, setValue, loadingSafetyCheck]
  );

  return (
    // TODO: re-rendering after initial amount capping is messed up and lets anything you type through
    <NumericFormat
      value={value}
      placeholder="0"
      allowNegative={false}
      decimalScale={maxDecimals}
      disabled={disabled}
      onValueChange={onChange}
      thousandSeparator=","
      customInput={TextField}
      size="small"
      max={maxValue}
      InputProps={{
        // @todo width is hacky here
        className:
          "font-aeonik h-12 px-0 bg-[#1C2125] text-[#e1e1e1] text-base font-light rounded-lg self-center w-[210px]",
      }}
    />
  );
};

interface CampaignWizardProps {}

const CampaignWizard: FC<CampaignWizardProps> = () => {
  const [guaranteedApy, setGuaranteedApy] = useState(0);
  const [lockupPeriodInDays, setLockupPeriodInDays] = useState(0);
  const [depositCapacity, setDepositCapacity] = useState(0);
  const [campaignBank, setCampaignBank] = useState<Bank | null>(null);

  const walletContext = useWalletContext();
  const [mfiClient] = useMrgnlendStore((state) => [state.marginfiClient]);
  const { lipClient, reload: reloadLipClient } = useLipClient();

  const availableBanks = useMemo(() => {
    if (!mfiClient) return [];
    return [...mfiClient.banks.values()];
  }, [mfiClient]);

  useEffect(() => {
    if (availableBanks.length === 0 || campaignBank !== null) return;
    setCampaignBank(availableBanks[0]);
  }, [availableBanks, campaignBank]);

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
    const userTokenAtaPk = getAssociatedTokenAddressSync(campaignBank.mint, lipClient.wallet.publicKey, true); // We allow off curve addresses here to support Fuse.

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
          marginfiBank: campaignBank.address,
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

  // @todo Move to config?
  // Not sure how worth it given LIP campaign creation's small user base
  const assetIcons: { [key: string]: { [key: string]: any } } = {
    CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh: {
      icon: "https://cryptologos.cc/logos/solana-sol-logo.png?v=024",
      size: 30,
    },
    "2s37akK2eyBbp8DZgCm7RtsaEz8eJP3Nxd4urLHQv7yB": {
      icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
      size: 30,
    },
    "22DcjMZrMwC5Bpa5AGBsmjc5V9VuQrXG6N9ZtdUNyYGE": {
      icon: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png",
      size: 30,
    },
    DeyH7QxWvnbbaVB4zFrf4hoq7Q8z1ZT14co42BGwGtfM: {
      icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png",
      size: 30,
    },
    HmpMfL8942u22htC4EMiWgLX931g3sacXFR6KjuLgKLV: {
      icon: "https://cryptologos.cc/logos/tether-usdt-logo.png?v=024",
      size: 30,
    },
    BkUyfXjbBBALcfZvw76WAFRvYQ21xxMWWeoPtJrUqG3z: {
      icon: "https://raw.githubusercontent.com/certusone/wormhole-token-list/main/assets/ETH_wh.png",
      size: 30,
    },
    BKsfDJCMbYep6gr9pq8PsmJbb5XGLHbAJzUV8vmorz7a: {
      icon: "https://raw.githubusercontent.com/certusone/wormhole-token-list/main/assets/WBTC_wh.png",
      size: 30,
    },
    Bohoc1ikHLD7xKJuzTyiTyCwzaL5N7ggJQu75A8mKYM8: {
      icon: "https://storage.googleapis.com/token-metadata/JitoSOL-256.png",
      size: 30,
    },
  };

  return (
    <div className="flex flex-col justify-center p-5 pt-0 bg-transparent z-20 leading-10 min-w-[700px] max-w-7xl gap-4">
      <div className="text-4xl flex justify-center mb-4 font-medium">Create an LIP campaign</div>
      <div className="flex justify-between text-[rgb(227, 227, 227)]">
        <div>Campaign asset:</div>
        <Select
          className="bg-[#1C2125] text-white text-base rounded-lg h-12 w-[210px]"
          MenuProps={{
            PaperProps: {
              style: {
                backgroundColor: "#1C2125",
                color: "#fff",
              },
            },
          }}
          labelId="campaign-bank-label"
          id="campaign-bank-select"
          variant="outlined"
          classes={{ standard: "test-white" }}
          value={campaignBank.address.toBase58()}
          onChange={(event) => {
            const bank = availableBanks.find((b) => b.address.toBase58() === event.target.value);
            if (!bank) throw new Error("Bank not found");
            setCampaignBank(bank);
          }}
        >
          {availableBanks.map((b) => {
            let assetIcon = assetIcons[b.address.toBase58()];
            if (!assetIcon) assetIcon = assetIcons["CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh"];

            return (
              <MenuItem key={b.address.toBase58()} value={b.address.toBase58()}>
                <div className="flex gap-4 items-center">
                  <Image
                    src={assetIcon.icon}
                    alt={b.address.toBase58()}
                    height={assetIcon.size}
                    width={assetIcon.size}
                  />
                  <div>{b.address.toBase58()}</div>
                </div>
              </MenuItem>
            );
          })}
        </Select>
      </div>
      <div className="flex justify-between">
        <div>Guaranteed APY %:</div>
        <CampaignWizardInputBox
          value={guaranteedApy * 100}
          setValue={(value) => setGuaranteedApy(value / 100)}
          loadingSafetyCheck={() => {}}
          maxDecimals={2}
          disabled={!walletContext.connected}
        />
      </div>
      <div className="flex justify-between text-[rgb(227, 227, 227)]">
        <div>Lockup period (days):</div>
        <div className="max-w-[250px]">
          <CampaignWizardInputBox
            value={lockupPeriodInDays}
            setValue={setLockupPeriodInDays}
            loadingSafetyCheck={() => {}}
            maxDecimals={4}
            disabled={!walletContext.connected}
          />
        </div>
      </div>
      <div className="flex justify-between text-[rgb(227, 227, 227)]">
        <div>Campaign size (in asset unit):</div>
        <CampaignWizardInputBox
          value={depositCapacity}
          setValue={setDepositCapacity}
          loadingSafetyCheck={() => {}}
          maxDecimals={3}
          disabled={!walletContext.connected}
        />
      </div>
      <div></div>
      <div>
        <b style={{ color: "#DCE85D" }}>Summary:</b>
        <div className="flex justify-between">
          Guaranteed APY:{" "}
          <span style={{ color: "rgb(227, 227, 227)", fontWeight: "bold" }}>
            {percentFormatterDyn.format(guaranteedApy)}
          </span>
        </div>
        <div className="flex justify-between text-[rgb(227, 227, 227)]">
          Lockup period:{" "}
          <span style={{ color: "rgb(227, 227, 227)", fontWeight: "bold" }}>{lockupPeriodInDays} days</span>
        </div>
        <div className="flex justify-between">
          Max campaign deposits:{" "}
          <span
            style={{
              color: "rgb(227, 227, 227)",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(depositCapacity)}
          </span>
        </div>
        <div className="flex justify-between text-[rgb(227, 227, 227)]">
          Max rewards:{" "}
          <span
            style={{
              color: "rgb(227, 227, 227)",
              fontWeight: "bold",
            }}
          >
            {groupedNumberFormatterDyn.format(maxRewards)}
          </span>
        </div>
        <div className="flex justify-between text-[rgb(227, 227, 227)]">
          Campaign APY:{" "}
          <span
            style={{
              color: "rgb(227, 227, 227)",
              fontWeight: "bold",
            }}
          >
            {campaignBank
              ? percentFormatterDyn.format(
                  computeGuaranteedApy(
                    contractInputs.lockupPeriod.toNumber(),
                    contractInputs.maxDeposits.toNumber(),
                    contractInputs.maxRewards.toNumber()
                  )
                )
              : 0}
          </span>
        </div>
      </div>
      <div className="flex justify-center my-8">
        <EarnAction
          onClick={createCampaign}
          disabled={mfiClient === null || !lipClient || !campaignBank || maxRewards === 0}
        >
          Create campaign
        </EarnAction>
      </div>
    </div>
  );
};

export { CampaignWizard };
