import { Typography, Modal } from "@mui/material";
import { Dispatch, FC, SetStateAction, useState } from "react";
import { Close } from "@mui/icons-material";
import Image from "next/image";
import { nativeToUi, numeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { SOL_MINT, TokenDataMap } from "~/store/lstStore";
import { LstDepositToggle } from "./LstDepositToggle";
import { StakeData } from "~/utils/stakeAcounts";
import { DepositOption } from "./StakingCard";
import BN from "bn.js";

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
        <Typography className="my-4 font-aeonik font-[500] text-2xl inline">
          {isStakeAccountMode ? "Select stake account" : "Select token"}
        </Typography>
        <div className="flex flex-col overflow-y-auto">
          {isStakeAccountMode ? (
            <StakeAccountList
              depositOption={depositOption}
              stakeAccounts={stakeAccounts}
              setSelectedStakeAccount={setDepositOption}
              handleClose={handleClose}
            />
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
        className={`flex flex-row w-full justify-between font-aeonik font-[400] text-xl items-center gap-4 p-2 rounded-lg ${
          depositOption.type === "native" && "text-black bg-[#DCE85DBB]"
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
          <Typography>{"SOL (native)"}</Typography>
        </div>
        <div className="flex flex-row items-center">
          {availableLamportsUi > 0 && (
            <>
              <Typography>{availableLamportsUi < 0.01 ? "< 0.01" : numeralFormatter(availableLamportsUi)}</Typography>
              <Typography className="flex justify-end min-w-[75px]">
                ({lamportsUsdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(lamportsUsdValue)}`})
              </Typography>
            </>
          )}
        </div>
      </div>

      {[...tokenDataMap.values()]
        .filter((token) => token.balance.gtn(0))
        .sort((a, b) => nativeToUi(b.balance, b.decimals) * Number(b.price) - nativeToUi(a.balance, a.decimals) * Number(a.price))
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
              className={`flex flex-row w-full justify-between font-aeonik font-[400] text-xl items-center gap-4 p-2 rounded-lg hover:text-white hover:bg-gray-700 cursor-pointer ${
                depositOption.type === "token" && depositOption.tokenData.address === token.address && "text-black bg-[#DCE85DBB]"
              }`}
            >
              <div className="flex flex-row items-center gap-2">
                <Image src={token.iconUrl} alt="token logo" height={35} width={35} className="rounded-full" />
                <Typography>{token.address === SOL_MINT.toBase58() ? "SOL (wrapped)" : token.symbol}</Typography>
              </div>
              <div className="flex flex-row items-center w">
                {token.balance.gtn(0) && (
                  <>
                    <Typography>{balanceUi < 0.01 ? "< 0.01" : numeralFormatter(balanceUi)}</Typography>
                    <Typography className="flex justify-end min-w-[75px]">
                      ({usdValue < 0.01 ? "< $0.01" : `$${numeralFormatter(usdValue)}`})
                    </Typography>
                  </>
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
            <div className={`flex flex-row w-full justify-between font-aeonik font-[400] text-xl items-center gap-4 p-2 rounded-lg hover:text-white hover:bg-gray-700 cursor-pointer ${
                depositOption.type === "stake" && depositOption.stakeData.address === stakeData.address && "text-black bg-[#DCE85DBB]"
              }`}>
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
                <Typography>{shortenAddress(stakeData.address)}</Typography>
              </div>
              <div className="flex flex-row items-center w">
                <Typography>{nativeToUi(stakeData.lamports, 9)}</Typography>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
};
