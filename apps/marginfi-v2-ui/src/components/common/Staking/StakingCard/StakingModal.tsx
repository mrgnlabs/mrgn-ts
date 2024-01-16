import { Typography, Modal } from "@mui/material";
import { Dispatch, FC, SetStateAction, useState } from "react";
import { Close, Launch } from "@mui/icons-material";
import Image from "next/image";
import { nativeToUi, numeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { SOL_MINT, TokenDataMap } from "~/store/lstStore";
import { LstDepositToggle } from "./LstDepositToggle";
import { DepositOption } from "./StakingCard";
import BN from "bn.js";
import { PublicKey } from "@solana/web3.js";
import InfoIcon from "@mui/icons-material/Info";
import { StakeData } from "~/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

interface StakingModalProps {
  isOpen: boolean;
  handleClose: () => void;
  depositOption: DepositOption;
  setDepositOption: Dispatch<SetStateAction<DepositOption>>;
  availableLamports: BN;
  solUsdPrice: number;
  tokenDataMap: TokenDataMap;
  stakeAccounts: StakeData[];
}

export const StakingModal: FC<StakingModalProps> = ({
  isOpen,
  handleClose,
  depositOption,
  setDepositOption,
  availableLamports,
  solUsdPrice,
  tokenDataMap,
  stakeAccounts,
}) => {
  const [isStakeAccountMode, setIsStakeAccountMode] = useState(depositOption.type === "stake");

  return (
    <Modal
      open={isOpen}
      onClose={handleClose}
      aria-labelledby="parent-modal-title"
      aria-describedby="parent-modal-description"
      className="border-none"
    >
      <div className="flex flex-col mx-auto mt-40 rounded-xl bg-[#1C2023] w-[400px] max-w-[90%] h-[500px] p-4">
        <div className="min-h-[40px] flex flex-row justify-between">
          <div className="w-[88%]">
            <LstDepositToggle checked={!isStakeAccountMode} setChecked={setIsStakeAccountMode} />
          </div>
          <div className="w-[10%] flex flex-row justify-center items-center">
            <Close className="cursor-pointer hover:text-[#DCE85D]" onClick={handleClose} />
          </div>
        </div>
        <div className="flex my-4 gap-2">
          <Typography className="font-aeonik font-[500] text-[22px]">
            {isStakeAccountMode ? "Select stake account" : "Select token"}
          </Typography>
          <div className="h-full flex justify-center items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="hover:text-[#DCE85D]" fontSize="small" />
                </TooltipTrigger>
                <TooltipContent>
                  {isStakeAccountMode ? (
                    <Typography className="font-aeonik text-sm">
                      Convert your native SOL stake into $LST instantly
                    </Typography>
                  ) : (
                    <Typography className="font-aeonik text-sm">
                      Convert your tokens to $LST effortlessly. Powered by Jupiter.
                    </Typography>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <div className="flex flex-col overflow-y-auto pr-1">
          {isStakeAccountMode ? (
            stakeAccounts.length > 0 ? (
              <StakeAccountList
                depositOption={depositOption}
                stakeAccounts={stakeAccounts}
                setSelectedStakeAccount={setDepositOption}
                handleClose={handleClose}
              />
            ) : (
              <div className="flex justify-center mt-8">
                <Typography className="font-aeonik font-[300] text-[#BBB] text-lg">
                  No eligible stake accounts found
                </Typography>
              </div>
            )
          ) : (
            <TokenList
              depositOption={depositOption}
              availableLamports={availableLamports}
              solUsdPrice={solUsdPrice}
              tokenDataMap={tokenDataMap}
              setDepositOption={setDepositOption}
              handleClose={handleClose}
            />
          )}
        </div>
      </div>
    </Modal>
  );
};

const TokenList: FC<{
  availableLamports: BN;
  solUsdPrice: number;
  tokenDataMap: TokenDataMap;
  depositOption: DepositOption;
  setDepositOption: Dispatch<SetStateAction<DepositOption>>;
  handleClose: () => void;
}> = ({ availableLamports, solUsdPrice, tokenDataMap, depositOption, setDepositOption, handleClose }) => {
  const availableLamportsUi = nativeToUi(availableLamports, 9);
  const lamportsUsdValue = availableLamportsUi * solUsdPrice;
  return (
    <div className="flex flex-col justify-center items-center gap-2">
      <div
        key={"nativeSol"}
        onClick={() => {
          setDepositOption({ type: "native", amount: new BN(0), maxAmount: availableLamports });
          handleClose();
        }}
        className={`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg ${
          depositOption.type === "native" && "bg-[#DCE85D88]"
        } hover:text-white hover:bg-gray-700 cursor-pointer`}
      >
        <div className="flex flex-row items-center gap-2">
          <Image
            src={
              "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            }
            alt="token logo"
            height={35}
            width={35}
            className="rounded-full"
          />

          <div className="flex flex-col justify-start">
            <Typography className="text-[15px]">{"SOL (native)"}</Typography>
            <AccountBadge account={SOL_MINT} type="token" />
          </div>
        </div>
        <div className="flex flex-row items-center">
          {availableLamportsUi > 0 && (
            <div className="flex flex-col justify-end">
              <Typography className="flex justify-end text-sm">
                {availableLamportsUi < 0.01 ? "< 0.01" : numeralFormatter(availableLamportsUi)}
              </Typography>
              <Typography className="flex justify-end text-sm text-[#BBB]">
                {lamportsUsdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(lamportsUsdValue)}`}
              </Typography>
            </div>
          )}
        </div>
      </div>

      {[...tokenDataMap.values()]
        .filter((token) => token.balance.gtn(0))
        .sort(
          (a, b) =>
            nativeToUi(b.balance, b.decimals) * Number(b.price) - nativeToUi(a.balance, a.decimals) * Number(a.price)
        )
        .map((token) => {
          const balanceUi = nativeToUi(token.balance, token.decimals);
          const usdValue = balanceUi * token.price;
          return (
            <div
              key={token.address}
              onClick={() => {
                setDepositOption({ type: "token", tokenData: token, amount: new BN(0) });
                handleClose();
              }}
              className={`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg hover:text-white hover:bg-gray-700 cursor-pointer ${
                depositOption.type === "token" &&
                depositOption.tokenData.address === token.address &&
                "text-black bg-[#DCE85D88]"
              }`}
            >
              <div className="flex flex-row items-center gap-2">
                <Image src={token.iconUrl} alt="token logo" height={35} width={35} className="rounded-full" />
                <div className="flex flex-col justify-start">
                  <Typography className="text-[15px]">
                    {token.address === SOL_MINT.toBase58() ? "SOL (wrapped)" : token.symbol}
                  </Typography>
                  <AccountBadge account={token.address} type="token" />
                </div>
              </div>
              <div className="flex flex-row items-center">
                {token.balance.gtn(0) && (
                  <div className="flex flex-col justify-end">
                    <Typography className="flex justify-end text-sm">
                      {balanceUi < 0.01 ? "< 0.01" : numeralFormatter(balanceUi)}
                    </Typography>
                    <Typography className="flex justify-end text-sm text-[#BBB]">
                      {usdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(usdValue)}`}
                    </Typography>
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
};

const StakeAccountList: FC<{
  depositOption: DepositOption;
  stakeAccounts: StakeData[];
  setSelectedStakeAccount: Dispatch<SetStateAction<DepositOption>>;
  handleClose: () => void;
}> = ({ depositOption, stakeAccounts, setSelectedStakeAccount, handleClose }) => {
  return (
    <div className="flex flex-col gap-2">
      {stakeAccounts
        .sort((a, b) => b.lamports.sub(a.lamports).toNumber())
        .map((stakeData) => {
          return (
            <a
              key={stakeData.address.toBase58()}
              onClick={() => {
                setSelectedStakeAccount({ type: "stake", stakeData });
                handleClose();
              }}
            >
              <div
                className={`flex flex-row w-full justify-between font-aeonik font-[400] text-base items-center gap-4 p-2 rounded-lg hover:text-white hover:bg-gray-700 cursor-pointer ${
                  depositOption.type === "stake" &&
                  depositOption.stakeData.address === stakeData.address &&
                  "text-black bg-[#DCE85D88]"
                }`}
              >
                <div className="flex flex-row items-center gap-2">
                  <Image
                    src={
                      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
                    }
                    alt="token logo"
                    height={35}
                    width={35}
                    className="rounded-full"
                  />
                  <AccountBadge account={stakeData.address} type="stake" />
                </div>
                <div className="flex flex-row items-center w">
                  <Typography>{nativeToUi(stakeData.lamports, 9)} SOL</Typography>
                </div>
              </div>
            </a>
          );
        })}
    </div>
  );
};

type AccountType = "token" | "stake";

const AccountBadge: FC<{ account: PublicKey | string; type: AccountType }> = ({ account, type }) => (
  <a
    className="w-[100px] h-[16px] inline-flex items-center justify-center rounded-md bg-[#DCE85D] px-2 py-1 text-xs font-[] text-gray-600 ring-1 ring-inset ring-gray-500/10"
    target="_blank"
    rel="noreferrer"
    href={`https://solscan.io/${type === "stake" ? "account" : "token"}/${account.toString()}`}
    onClick={(event) => event.stopPropagation()}
  >
    {shortenAddress(account)}
    <Launch className="ml-1 w-[12px]" />
  </a>
);
