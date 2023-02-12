import React, { FC, ReactNode, useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { useProgram } from "~/context";
import { Button, ButtonProps, CircularProgress, LinearProgress, TextField } from "@mui/material";
import { usdFormatter } from "~/utils/formatters";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import dynamic from "next/dynamic";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import Image from "next/image";
import LipAccount from "@mrgnlabs/lip-client/src/account";
import { Keypair, Transaction } from "@solana/web3.js";
import { associatedAddress } from "@project-serum/anchor/dist/cjs/utils/token";
import BN from "bn.js";
import { uiToNative } from "@mrgnlabs/mrgn-common";

const Marks: FC<{ marks: { value: any; color: string; label: string }[] }> = ({ marks }) => (
  <>
    {marks.map((mark, index) => (
      <div
        key={index}
        className="flex flex-col"
        style={{
          border: "solid white 1px",
        }}
      >
        <div
          key={index}
          style={{
            left: `${mark.value}%`,
            position: "absolute",
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: `${mark.color}`,
            top: "50%",
            transform: "translate(-50%, -50%)",
          }}
          className="flex justify-center items-center"
        >
          <div
            className="mt-12 text-xs text-[#484848]"
            style={{
              letterSpacing: "4px",
            }}
          >
            {mark.label}
          </div>
        </div>
      </div>
    ))}
  </>
);

// ================================
// ACTION BUTTON
// ================================

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

interface ProActionProps extends ButtonProps {
  children: ReactNode;
  spinning?: boolean;
}

const ProAction: FC<ProActionProps> = ({ children, spinning, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className="bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px]"
      style={{
        backgroundColor: disabled || !wallet.connected ? "gray" : "rgb(227, 227, 227)",
        color: "black",
        fontFamily: "Aeonik Pro",
        zIndex: 10,
      }}
      {...otherProps}
      disabled={disabled || !wallet.connected}
    >
      {spinning ? <CircularProgress style={{ color: "#3CAB5F", width: "20px", height: "20px" }} /> : children}
    </Button>
  ) : (
    <WalletMultiButtonDynamic
      className="bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px] flex justify-center items-center"
      startIcon={undefined}
    >
      Connect
    </WalletMultiButtonDynamic>
  );
};

// ================================
// ACTION BUTTON
// ================================

// ================================
// INPUT BOX
// ================================

interface ProInputBox {
  value: number;
  setValue: (value: number) => void;
  loadingSafetyCheck: () => void;
  maxValue?: number;
  maxDecimals?: number;
  disabled?: boolean;
}

const ProInputBox: FC<ProInputBox> = ({ value, setValue, loadingSafetyCheck, maxValue, maxDecimals, disabled }) => {
  // const onMaxClick = useCallback(() => {
  //   if (maxValue !== undefined) {
  //     setValue(maxValue);
  //   } else {
  //     toast.error("Not implemented");
  //   }
  // }, [maxValue, setValue]);

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
          "font-aeonik min-w-[360px] h-12 px-0 bg-[#1C2125] text-[#e1e1e1] text-sm font-light rounded-lg self-center",
        // @note: removing max feature for now for simplicity
        // keeping here to add later
        // endAdornment: <MaxInputAdornment onClick={onMaxClick} />,
      }}
    />
  );
};

// // @todo not happy with how this looks on small screens
// const MaxInputAdornment: FC<{
//   onClick: MouseEventHandler<HTMLDivElement>;
//   disabled?: boolean;
// }> = ({ onClick, disabled }) => (
//   <InputAdornment position="end" classes={{ root: "max-w-[40px] h-full" }}>
//     <div
//       className={`font-aeonik p-0 pr-4 text-[#868E95] text-sm lowercase h-9 font-light flex justify-center items-center hover:bg-transparent ${
//         disabled ? "cursor-default" : "cursor-pointer"
//       }`}
//       onClick={onClick}
//     >
//       max
//     </div>
//   </InputAdornment>
// );

// ================================
// INPUT BOX
// ================================

// ================================
// ASSET SELECTION
// ================================

interface AssetSelectionProps {
  setSelectedAsset: (asset: string) => void;
  defaultAsset: string;
}

const CAMPAIGNS_WHITELIST = [
  {
    label: "SOL",
    value: "SOL",
    icon: "https://cryptologos.cc/logos/solana-sol-logo.png?v=024",
    size: 30,
    guaranteedApr: 9.48,
  },
  {
    label: "USDC",
    value: "USDC",
    icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
    size: 30,
    guaranteedApr: 3.77,
  },
];

const AssetSelection: FC<AssetSelectionProps> = ({ setSelectedAsset, defaultAsset }) => {
  return (
    <FormControl className="min-w-[360px] w-[360px]">
      <RadioGroup
        defaultValue={defaultAsset}
        className="flex flex-col justify-center items-center gap-2"
        onChange={(event) => {
          setSelectedAsset(event.target.value);
        }}
      >
        {CAMPAIGNS_WHITELIST.map(({ value, label, icon, size, guaranteedApr }) => (
          <FormControlLabel
            key={value}
            value={value}
            control={
              <Radio
                className="bg-[#1E1E1E] mr-2"
                sx={{
                  color: "#1E1E1E",
                  "&.Mui-checked": {
                    color: "#3CAB5F",
                  },
                }}
              />
            }
            label={
              <div className="w-[295px] flex justify-between items-center">
                <div>{label}</div>
                <div className="flex gap-4 justify-center items-center">
                  <div
                    className={`font-aeonik flex justify-center items-center px-2 text-[#3AFF6C] bg-[#3aff6c1f] rounded-xl text-sm`}
                  >
                    APR: {guaranteedApr}%
                  </div>
                  <div className="ml-[2px] w-[40px]">
                    <Image src={icon} alt={value} height={size} width={size} />
                  </div>
                </div>
              </div>
            }
            className="w-full bg-[#000] ml-0 mr-0 rounded-[100px] p-1 h-12"
            style={{ border: "solid #1C2125 1px" }}
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
};
// ================================
// ASSET SELECTION
// ================================

const Pro = () => {
  const wallet = useWallet();
  const defaultAsset = "SOL";
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(defaultAsset);
  const [amount, setAmount] = React.useState(0);
  const [progressPercent, setProgressPercent] = React.useState(0);
  const [lipAccount, setLipAccount] = useState<LipAccount | null>(null);
  const { lipClient, mfiClient, reload: reloadLipClient } = useProgram();

  useEffect(() => {
    (async function () {
      setInitialFetchDone(true);
      if (!mfiClient || !lipClient || !wallet.publicKey) return;
      const lipAccount = await LipAccount.fetch(wallet.publicKey, lipClient, mfiClient);
      setLipAccount(lipAccount);
    })();
  }, [lipClient, mfiClient, wallet.publicKey]);

  const marks = [
    { value: 0, label: "CONNECT", color: progressPercent > 0 ? "#51B56A" : "#484848" },
    { value: 50, label: "SELECT", color: progressPercent >= 50 ? "#51B56A" : "#484848" },
    { value: 100, label: "READY", color: progressPercent >= 100 ? "#51B56A" : "#484848" },
  ];

  useEffect(() => {
    if (wallet.connected) {
      setProgressPercent(50);
    } else {
      setProgressPercent(0);
    }
  }, [wallet.connected]);

  useEffect(() => {
    if (amount > 0) {
      setProgressPercent(100);
    } else {
      if (wallet.connected) {
        setProgressPercent(50);
      } else {
        setProgressPercent(0);
      }
    }
  }, [amount, wallet.connected]);

  const depositAction = useCallback(async () => {
    if (!lipAccount || !lipClient || !selectedAsset || amount === 0) return;

    const campaign = lipClient.campaigns.find((campaign) => campaign.bank.label === selectedAsset);
    if (!campaign) throw new Error("Campaign not found");
    setReloading(true);
    try {
      await lipClient.deposit(campaign.publicKey, amount, campaign.bank);
      setLipAccount(await lipAccount.reloadAndClone());
      setAmount(0);
    } catch (e) {
      console.error(e);
    }
    setReloading(false);
  }, [amount, lipAccount, lipClient, selectedAsset]);

  const createCampaign = useCallback(async () => {
    if (mfiClient === null || !lipClient || !selectedAsset) return;

    const campaignKeypair = Keypair.generate();
    const banks = mfiClient.group.banks;
    const bank = [...banks.values()].find((b) => b.label === selectedAsset);
    if (!bank) throw new Error("Bank not found");
    const userTokenAtaPk = await associatedAddress({
      mint: bank.mint,
      owner: lipClient.wallet.publicKey,
    });

    const ix = await lipClient.program.methods
      .createCampaign(new BN(1), uiToNative(1, bank.mintDecimals), uiToNative(1, bank.mintDecimals))
      .accounts({
        campaign: campaignKeypair.publicKey,
        admin: lipClient.wallet.publicKey,
        fundingAccount: userTokenAtaPk,
        marginfiBank: bank.publicKey,
        assetMint: bank.mint,
      })
      .instruction();
    await lipClient.processTransaction(new Transaction().add(ix), [campaignKeypair]);
    await reloadLipClient();
    setLipAccount(lipAccount);
    setAmount(0);
  }, [lipAccount, lipClient, mfiClient, reloadLipClient, selectedAsset]);

  const loadingSafetyCheck = useCallback(() => {
    if (!mfiClient || !lipAccount || !lipClient) {
      setInitialFetchDone(false)
    }
  }, [ lipAccount, lipClient, mfiClient, setInitialFetchDone])

  return (
    <>
      <PageHeader />
      <div className="h-full flex flex-col justify-start items-center content-start py-[64px] w-4/5 max-w-7xl gap-4">
        <div className="w-[360px] flex flex-col items-center gap-6">
          <div className="w-[300px] h-[100px] flex flex-col gap-5 mb-8 justify-center">
            <div className="flex flex-col gap-1 w-full justify-center">
              {wallet.connected && (
                <div className="text-2xl flex justify-center gap-2" style={{ fontWeight: 400 }}>
                  Your deposits:
                  <span style={{ color: "#51B56A" }}>
                    {
                      // Since users will only be able to deposit to the LIP,
                      // the balance of their account should match total deposits.
                    }
                    {usdFormatter.format(lipAccount?.getTotalBalance().toNumber() || 0)}
                  </span>
                </div>
              )}
            </div>
            <div className="col-span-full flex flex-col justify-center items-center">
              <LinearProgress
                className="h-1 w-[300px] rounded-lg"
                variant="determinate"
                color="inherit"
                value={progressPercent}
                sx={{
                  backgroundColor: "#484848",
                  "& .MuiLinearProgress-bar": {
                    backgroundColor: "#51B56A",
                  },
                }}
              />
              <div className="flex absolute w-[300px] self-center justify-between">
                <Marks marks={marks} />
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <AssetSelection setSelectedAsset={setSelectedAsset} defaultAsset={defaultAsset} />
          </div>

          <div className="flex justify-center">
            <ProInputBox
              value={amount}
              setValue={setAmount}
              maxValue={500000} // @todo hardcoded
              loadingSafetyCheck={loadingSafetyCheck}
              maxDecimals={2}
              disabled={!wallet.connected}
            />
          </div>

          <div className="flex justify-center">
            {
              // You can only deposit right now.
              // All funds will be locked up for 6 months, each from the date of its *own* deposit.
            }
            <ProAction
              onClick={depositAction}
              spinning={!initialFetchDone || reloading}
              disabled={!initialFetchDone || reloading}
            >
              Deposit
            </ProAction>
          </div>

          {wallet.connected && process.env.NEXT_PUBLIC_MARGINFI_FEATURES_CREATE_CAMPAIGN === "true" && (
            <div className="flex justify-center">
              <ProAction onClick={createCampaign}>Create campaign</ProAction>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Pro;
