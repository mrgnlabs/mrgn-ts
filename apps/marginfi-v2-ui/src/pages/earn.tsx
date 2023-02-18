import React, { FC, MouseEventHandler, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { useProgram } from "~/context";
import { Button, ButtonProps, CircularProgress, InputAdornment, LinearProgress, TextField } from "@mui/material";
import { percentFormatterDyn, usdFormatter } from "~/utils/formatters";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import dynamic from "next/dynamic";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import Image from "next/image";
import LipAccount, { Campaign } from "@mrgnlabs/lip-client/src/account";
import { CampaignWizard } from "~/components/CampaignWizard";
import config from "~/config";
import { computeGuaranteedApyForCampaign } from "@mrgnlabs/lip-client/src/utils";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { floor } from "~/utils";

const Marks: FC<{ marks: { value: any; color: string; label: string }[] }> = ({ marks }) => (
  <>
    {marks.map((mark, index) => (
      <div key={index} className="flex flex-col">
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

export const ProAction: FC<ProActionProps> = ({ children, spinning, disabled, ...otherProps }) => {
  const wallet = useWallet();

  return wallet.connected ? (
    <Button
      className={`bg-white text-black normal-case text-sm min-w-[360px] w-[360px] h-12 rounded-[100px] ${
        disabled && "cursor-not-allowed"
      }`}
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

export const ProInputBox: FC<ProInputBox> = ({
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
          "font-aeonik min-w-[360px] h-12 px-0 bg-[#1C2125] text-[#e1e1e1] text-sm font-light rounded-lg self-center",
        endAdornment: (
          <MaxInputAdornment
            onClick={() => {
              if (maxValue !== undefined) {
                console.log(maxValue);
                setValue(maxValue);
              }
            }}
          />
        ),
      }}
    />
  );
};

const MaxInputAdornment: FC<{
  onClick: MouseEventHandler<HTMLDivElement>;
  disabled?: boolean;
}> = ({ onClick, disabled }) => (
  <InputAdornment position="end" classes={{ root: "max-w-[40px] h-full" }}>
    <div
      className={`font-aeonik p-0 pr-4 text-[#868E95] text-sm lowercase h-9 font-light flex justify-center items-center hover:bg-transparent ${
        disabled ? "cursor-default" : "cursor-pointer"
      }`}
      onClick={onClick}
    >
      max
    </div>
  </InputAdornment>
);

// ================================
// INPUT BOX
// ================================

// ================================
// ASSET SELECTION
// ================================

interface WhitelistedCampaignWithMeta {
  campaign: Campaign;
  meta: {
    icon: string;
    size: number;
  };
}

interface AssetSelectionProps {
  setSelectedCampaign: (campaign: WhitelistedCampaignWithMeta) => void;
  whitelistedCampaigns: WhitelistedCampaignWithMeta[];
}

const AssetSelection: FC<AssetSelectionProps> = ({ whitelistedCampaigns, setSelectedCampaign }) => {
  if (whitelistedCampaigns.length === 0) return null;
  const defaultCampaign = whitelistedCampaigns[0];

  return (
    <FormControl className="min-w-[360px] w-[360px]">
      <RadioGroup
        defaultValue={defaultCampaign.campaign.publicKey.toBase58()}
        className="flex flex-col justify-center items-center gap-2"
        onChange={(event) => {
          const campaign = whitelistedCampaigns.find((b) => b.campaign.publicKey.toBase58() === event.target.value);
          if (!campaign) throw new Error("Campaign not found");
          setSelectedCampaign(campaign);
        }}
      >
        {whitelistedCampaigns.map(({ campaign, meta }) => (
          <FormControlLabel
            key={campaign.publicKey.toBase58()}
            value={campaign.publicKey.toBase58()}
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
                <div>{campaign.bank.label}</div>
                <div className="flex gap-4 justify-center items-center">
                  <div
                    className={`font-aeonik flex justify-center items-center px-2 text-[#3AFF6C] bg-[#3aff6c1f] rounded-xl text-sm`}
                  >
                    Min. APY: {percentFormatterDyn.format(computeGuaranteedApyForCampaign(campaign))}
                  </div>
                  <div className="ml-[2px] w-[40px]">
                    <Image src={meta.icon} alt={campaign.bank.label} height={meta.size} width={meta.size} />
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
  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<WhitelistedCampaignWithMeta | null>(null);
  const [amount, setAmount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [lipAccount, setLipAccount] = useState<LipAccount | null>(null);
  const { lipClient, mfiClient } = useProgram();

  const whitelistedCampaignsWithMeta = useMemo(() => {
    if (!lipClient) return [];
    const whitelistedCampaigns =
      lipClient.campaigns.filter((c) =>
        config.campaignWhitelist.map((wc) => wc.publicKey).includes(c.publicKey.toBase58())
      ) || [];
    return whitelistedCampaigns
      .map((c) => {
        const campaignFound = config.campaignWhitelist.find((wc) => wc.publicKey === c.publicKey.toBase58());
        if (!campaignFound) throw Error("Campaign not found");
        const { publicKey, ...meta } = campaignFound;
        return {
          campaign: c,
          meta,
        };
      })
      .sort((c1, c2) => {
        if (c1.campaign.bank.label < c2.campaign.bank.label) return 1;
        if (c1.campaign.bank.label > c2.campaign.bank.label) return -1;
        return 0;
      });
  }, [lipClient, lipAccount]);

  const maxDepositAmount = useMemo(
    () =>
      selectedCampaign
        ? nativeToUi(selectedCampaign.campaign.remainingCapacity, selectedCampaign.campaign.bank.mintDecimals)
        : 0,
    [selectedCampaign]
  );

  const marks = [
    { value: 0, label: "CONNECT", color: progressPercent > 0 ? "#51B56A" : "#484848" },
    { value: 50, label: "SELECT", color: progressPercent >= 50 ? "#51B56A" : "#484848" },
    { value: 100, label: "READY", color: progressPercent >= 100 ? "#51B56A" : "#484848" },
  ];

  useEffect(() => {
    if (!selectedCampaign) return;
    const campaign = whitelistedCampaignsWithMeta.find(
      (c) => c.campaign.publicKey.toBase58() === selectedCampaign.campaign.publicKey.toBase58()
    );
    if (!campaign) throw new Error("Campaign not found");
    setSelectedCampaign(campaign);
  }, [selectedCampaign, whitelistedCampaignsWithMeta]);

  useEffect(() => {
    if (
      whitelistedCampaignsWithMeta === null ||
      whitelistedCampaignsWithMeta.length === 0 ||
      selectedCampaign !== null
    ) {
      return;
    }
    setSelectedCampaign(whitelistedCampaignsWithMeta[0]);
  }, [selectedCampaign, whitelistedCampaignsWithMeta]);

  useEffect(() => {
    setAmount(0);
  }, [selectedCampaign]);

  useEffect(() => {
    (async function () {
      setInitialFetchDone(true);
      if (!mfiClient || !lipClient || !wallet.publicKey) return;
      const lipAccount = await LipAccount.fetch(wallet.publicKey, lipClient, mfiClient);
      setLipAccount(lipAccount);
    })();
  }, [lipClient, mfiClient, wallet.publicKey]);

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
    if (!lipAccount || !lipClient || !selectedCampaign || amount === 0 || whitelistedCampaignsWithMeta.length === 0)
      return;

    setReloading(true);
    try {
      await lipClient.deposit(
        selectedCampaign.campaign.publicKey,
        floor(amount, selectedCampaign.campaign.bank.mintDecimals),
        selectedCampaign.campaign.bank
      );
      setLipAccount(await lipAccount.reloadAndClone());
      setAmount(0);
    } catch (e) {
      console.error(e);
    }
    setReloading(false);
  }, [amount, lipAccount, lipClient, selectedCampaign, whitelistedCampaignsWithMeta]);

  const loadingSafetyCheck = useCallback(() => {
    if (!mfiClient || !lipAccount || !lipClient) {
      setInitialFetchDone(false);
    }
  }, [lipAccount, lipClient, mfiClient, setInitialFetchDone]);

  return (
    <>
      <PageHeader />
      <div className="h-full flex flex-col justify-start items-center content-start py-[48px] w-4/5 max-w-7xl gap-4">
        <div className="w-[360px] flex flex-col items-center gap-6">
          <div className="w-[300px] h-[100px] flex flex-col gap-5 justify-center">
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
              <div className="flex relative w-[300px] self-center justify-between">
                <Marks marks={marks} />
              </div>
            </div>
          </div>

          <div className="w-[300px] flex flex-col my-4 justify-cen dter font-[rgb(227, 227, 227)]">
            <div className="flex justify-center gap-2 text-[#484848] text-xl" style={{ fontWeight: 400 }}>
              FUNDS WILL BE LOCKED FOR:
            </div>
            <div className="flex justify-center gap-2 text-2xl d" style={{ fontWeight: 400, letterSpacing: "0.2em" }}>
              ⚠️<span style={{ color: "yellow" }}>6 MONTHS</span>⚠️
            </div>
            <div className="flex justify-center gap-2 text-[#484848] text-xl" style={{ fontWeight: 400 }}>
              FROM DEPOSIT DATE
            </div>
          </div>

          <div className="flex justify-center">
            <AssetSelection
              whitelistedCampaigns={whitelistedCampaignsWithMeta}
              setSelectedCampaign={setSelectedCampaign}
            />
          </div>

          <div className="flex justify-center">
            <ProInputBox
              value={amount}
              setValue={setAmount}
              maxValue={maxDepositAmount}
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
            <CampaignWizard />
          )}
        </div>
      </div>
    </>
  );
};

export default Pro;
