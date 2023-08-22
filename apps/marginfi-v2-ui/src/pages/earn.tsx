import React, { FC, MouseEventHandler, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PageHeader } from "~/components/PageHeader";
import { useLipClient } from "~/context";
import { Button, ButtonProps, Card, CircularProgress, InputAdornment, LinearProgress, TextField } from "@mui/material";
import { groupedNumberFormatterDyn, percentFormatterDyn, usdFormatter, usdFormatterDyn } from "~/utils/formatters";
import { NumberFormatValues, NumericFormat } from "react-number-format";
import dynamic from "next/dynamic";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import Image from "next/image";
import LipAccount, { Campaign, Deposit } from "@mrgnlabs/lip-client/src/account";
import config from "~/config";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { floor } from "~/utils";
import { BankMetadataMap } from "~/types";
import { Bank, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { Countdown } from "~/components/Countdown";
import { toast } from "react-toastify";
import BigNumber from "bignumber.js";
import { useStore } from "~/store";

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
                setValue(maxValue);
              }
            }}
          />
        ),
      }}
    />
  );
};

export const MaxInputAdornment: FC<{
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
  bankMetadataMap?: BankMetadataMap;
}

const AssetSelection: FC<AssetSelectionProps> = ({ whitelistedCampaigns, setSelectedCampaign, bankMetadataMap }) => {
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
        {whitelistedCampaigns.map(({ campaign, meta }) => {
          return (
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
                  <div>{getTokenSymbol(campaign.bank, bankMetadataMap || {})}</div>
                  <div className="flex gap-4 justify-center items-center">
                    <div
                      className={`font-aeonik flex justify-center items-center px-2 text-[#3AFF6C] bg-[#3aff6c1f] rounded-xl text-sm`}
                    >
                      Min. APY: {percentFormatterDyn.format(campaign.computeGuaranteedApyForCampaign())}
                    </div>
                    <div className="ml-[2px] w-[40px]">
                      <Image src={meta.icon} alt={campaign.bank.mint.toBase58()} height={meta.size} width={meta.size} />
                    </div>
                  </div>
                </div>
              }
              className="w-full bg-[#000] ml-0 mr-0 rounded-[100px] p-1 h-12"
              style={{ border: "solid #1C2125 1px" }}
            />
          );
        })}
      </RadioGroup>
    </FormControl>
  );
};
// ================================
// ASSET SELECTION
// ================================

const Pro = () => {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const { lipClient } = useLipClient();

  const [mfiClient, bankMetadataMap, reloadMrgnlendState] = useStore((state) => [
    state.marginfiClient,
    state.bankMetadataMap,
    state.reloadMrgnlendState,
  ]);

  const [initialFetchDone, setInitialFetchDone] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<WhitelistedCampaignWithMeta | null>(null);
  const [amount, setAmount] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [lipAccount, setLipAccount] = useState<LipAccount | null>(null);

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
        if (c1.campaign.bank.mint.toBase58() < c2.campaign.bank.mint.toBase58()) return 1;
        if (c1.campaign.bank.mint.toBase58() > c2.campaign.bank.mint.toBase58()) return -1;
        return 0;
      });
    //eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lipClient, lipAccount]); // the extra `lipAccount` dependency is on purpose

  const maxDepositAmount = useMemo(
    () => (selectedCampaign ? selectedCampaign.campaign.remainingCapacity : 0),
    [selectedCampaign]
  );

  const marks = [
    { value: 0, label: "CONNECT", color: progressPercent > 0 ? "#51B56A" : "#484848" },
    { value: 50, label: "SELECT", color: progressPercent >= 50 ? "#51B56A" : "#484848" },
    { value: 100, label: "READY", color: progressPercent >= 100 ? "#51B56A" : "#484848" },
  ];

  useEffect(() => {
    reloadMrgnlendState(connection, anchorWallet);
    const id = setInterval(reloadMrgnlendState, 60_000);
    return () => clearInterval(id);
  }, [anchorWallet, connection, reloadMrgnlendState]);

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

  const closeDeposit = useCallback(
    async (deposit: Deposit) => {
      if (!lipAccount) return;
      toast.loading(`Closing deposit`, {
        toastId: "close-deposit",
      });
      try {
        await lipAccount.closePosition(deposit);
        toast.update("close-deposit", {
          render: `Closing deposit 👍`,
          type: toast.TYPE.SUCCESS,
          autoClose: 2000,
          isLoading: false,
        });
      } catch (e) {
        console.error(e);
        toast.update("close-deposit", {
          render: `Error closing deposit: ${e}`,
          type: toast.TYPE.ERROR,
          autoClose: 2000,
          isLoading: false,
        });
      }
      setReloading(true);
      setLipAccount(await lipAccount.reloadAndClone());
      setReloading(false);
    },
    [lipAccount]
  );

  return (
    <>
      <PageHeader />
      <div className="h-full flex flex-col justify-start items-center content-start py-[48px] w-4/5 max-w-7xl gap-4">
        <div className="w-[360px] flex flex-col items-center gap-6">
          <div className="w-[300px] h-[100px] flex flex-col gap-5 justify-center">
            <div className="flex flex-col gap-1 w-full justify-center">
              {wallet.connected && (
                <div className="text-2xl flex justify-center gap-2" style={{ fontWeight: 400 }}>
                  Your total deposits:
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
            <div className="relative col-span-full flex flex-col justify-center items-center">
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
              <div className="flex absolute w-[300px] justify-between">
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
              bankMetadataMap={bankMetadataMap}
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
        </div>
      </div>
      {lipAccount && (
        <>
          <div className="text-2xl flex justify-center gap-2 mb-[40px]" style={{ fontWeight: 400 }}>
            Your deposits
          </div>
          <div className="w-full max-w-[1000px] flex flex-wrap justify-center mb-[30px] gap-10">
            {lipAccount.deposits.map((deposit, index) => (
              <DepositTile
                key={index}
                deposit={deposit}
                closeDepositCb={closeDeposit}
                bankMetadataMap={bankMetadataMap || {}}
              />
            ))}
          </div>
        </>
      )}
    </>
  );
};

function getTokenSymbol(bank: Bank, bankMetadataMap: BankMetadataMap): string {
  const bankMetadata = bankMetadataMap[bank.address.toBase58()];
  if (!bankMetadata) {
    console.log("Bank metadata not found for %s", bank.address.toBase58());
    return shortenAddress(bank.mint);
  }

  return bankMetadata.tokenSymbol;
}

interface DepositTileProps {
  deposit: Deposit;
  closeDepositCb: (position: Deposit) => void;
  bankMetadataMap: BankMetadataMap;
}

const DepositTile: FC<DepositTileProps> = ({ deposit, closeDepositCb, bankMetadataMap }) => {
  const [isEnded, setIsEnded] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsRemaining = (deposit.endDate.getTime() - new Date().getTime()) / 1000;
      if (secondsRemaining <= 0) {
        setIsEnded(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deposit.endDate]);

  return (
    <div className=" w-[350px] flex justify-center">
      <Card className="w-full p-[20px] flex flex-col justify-start content-start bg-[#1C2125] text-white">
        <div className="w-full h-[50px] flex justify-center">
          {!isEnded ? (
            <Countdown targetDate={deposit.endDate} />
          ) : (
            <div className="flex items-center text-[#51b56a] font-bold">READY</div>
          )}
        </div>
        <div className="w-full flex justify-between mt-[10px]">
          <b>Start date:</b>
          {deposit.startDate.toLocaleString()}
        </div>
        <div className="w-full flex justify-between">
          <b>End date:</b>
          {deposit.endDate.toLocaleString()}
        </div>
        <div className="w-full flex justify-between">
          <b>Campaign:</b>
          <a
            href={`https://solscan.io/account/${deposit.campaign.publicKey.toBase58()}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {shortenAddress(deposit.campaign.publicKey)}
            <style jsx>{`
              a:hover {
                text-decoration: underline;
              }
            `}</style>
          </a>
        </div>
        <div className="w-full flex justify-between">
          <b>Lock-up:</b>
          {Math.floor(deposit.lockupPeriodInDays)} days
        </div>
        <div className="w-full flex justify-between">
          <b>Minimum APY:</b>
          {percentFormatterDyn.format(deposit.campaign.guaranteedApy)}
        </div>
        <div className="w-full flex justify-between">
          <b>Asset:</b>
          {getTokenSymbol(deposit.campaign.bank, bankMetadataMap)}
        </div>
        <div className="w-full flex justify-center items-center py-[20px]">
          <hr className="w-[50%]" />
        </div>
        <div className="w-full flex justify-between">
          <b>Amount locked:</b>
          {groupedNumberFormatterDyn.format(deposit.amount)} {getTokenSymbol(deposit.campaign.bank, bankMetadataMap)} (
          {usdFormatterDyn.format(deposit.computeUsdValue(deposit.campaign.oraclePrice, deposit.campaign.bank))})
        </div>
        <div className="w-full flex justify-between">
          <b>Minimum payout:</b>
          {groupedNumberFormatterDyn.format(deposit.maturityAmount)}{" "}
          {getTokenSymbol(deposit.campaign.bank, bankMetadataMap)} (
          {usdFormatterDyn.format(
            deposit.campaign.bank
              .computeUsdValue(
                deposit.campaign.oraclePrice,
                new BigNumber(deposit.maturityAmount),
                PriceBias.None,
                undefined,
                false
              )
              .toNumber()
          )}
          )
        </div>
        <Button
          variant="contained"
          className="mt-[15px] bg-[#51b56a] text-white"
          onClick={() => (isEnded ? closeDepositCb(deposit) : () => {})}
          disableRipple={!isEnded}
          style={{ cursor: isEnded ? "pointer" : "not-allowed", opacity: isEnded ? 1 : 0.5 }}
        >
          Withdraw
        </Button>
      </Card>
    </div>
  );
};

export default Pro;
