import Image from "next/image";
import React, { FC, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, Skeleton, Table, TableHead, TableBody, TableContainer, TableRow, TableCell } from "@mui/material";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { BorrowLendToggle } from "./BorrowLendToggle";
import AssetRow from "./AssetRow";
import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useHotkeys } from "react-hotkeys-hook";
import { BankMetadata } from "@mrgnlabs/mrgn-common";
import { ExtendedBankMetadata } from "@mrgnlabs/marginfi-v2-ui-state";
import { LoadingAsset } from "./AssetRow/AssetRow";

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const AssetsList: FC = () => {
  // const { selectedAccount, nativeSolBalance } = useStore();
  const wallet = useWallet();
  const [isStoreInitialized, sortedBanks, nativeSolBalance, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.selectedAccount,
  ]);
  const [lendZoomLevel, showBadges, setShowBadges] = useUserProfileStore((state) => [
    state.lendZoomLevel,
    state.showBadges,
    state.setShowBadges,
  ]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const [isHotkeyMode, setIsHotkeyMode] = useState(false);

  // Enter hotkey mode
  useHotkeys(
    "meta + k",
    () => {
      setIsHotkeyMode(true);
      setShowBadges(true);

      setTimeout(() => {
        setIsHotkeyMode(false);
        setShowBadges(false);
      }, 5000);
    },
    { preventDefault: true, enableOnFormTags: true }
  );

  // Handle number keys in hotkey mode
  useHotkeys(
    sortedBanks
      .filter((b) => !b.info.state.isIsolated)
      .map((_, i) => `${i + 1}`)
      .join(", "),
    (_, handler) => {
      if (isHotkeyMode) {
        const globalBankTokenNames = sortedBanks
          .filter((b) => !b.info.state.isIsolated)
          .sort(
            (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
          )
          .map((b) => b.meta.tokenSymbol);

        const keyPressed = handler.keys?.join("");
        if (Number(keyPressed) >= 1 && Number(keyPressed) <= globalBankTokenNames.length) {
          inputRefs.current[globalBankTokenNames[Number(keyPressed) - 1]]?.querySelector("input")!.focus();
          setIsHotkeyMode(false);
          setShowBadges(false);
        }
      }
    },
    { preventDefault: false, enableOnFormTags: true }
  );

  // Toggle lending mode in hotkey mode
  useHotkeys(
    "q",
    () => {
      if (isHotkeyMode) {
        setIsInLendingMode((prevMode) => !prevMode);
        setIsHotkeyMode(false);
        setShowBadges(false);
      }
    },
    { enableOnFormTags: true }
  );

  // Hack required to circumvent rehydration error
  const [hasMounted, setHasMounted] = React.useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }

  return (
    <>
      <div className="col-span-full">
        <BorrowLendToggle isInLendingMode={isInLendingMode} setIsInLendingMode={setIsInLendingMode} />
      </div>

      <div className="col-span-full">
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            <Table
              className="table-fixed"
              style={{
                borderCollapse: "separate",
                borderSpacing: "0px 8px",
              }}
            >
              <TableHead>
                <TableCell className="text-white border-none p-0">
                  <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white gap-1">
                    Global <span className="hidden lg:block">pool</span>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    Price
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            Realtime prices
                          </Typography>
                          Powered by Pyth and Switchboard.
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "APY" : "APR"}
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            {isInLendingMode ? "APY" : "APR"}
                          </Typography>
                          <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                            {isInLendingMode
                              ? "What you'll earn on deposits over a year. This includes compounding. All marginfi deposits are compounded hourly."
                              : "What you'll pay for your borrows, or the price of a loan. This does not include compounding. All marginfi borrows are compounded hourly."}
                          </span>
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "Weight" : "LTV"}
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            {isInLendingMode ? "Weight" : "LTV"}
                          </Typography>
                          {isInLendingMode
                            ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                            : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>
                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">
                    {isInLendingMode ? "Deposits" : "Available"}
                    <HtmlTooltip
                      title={
                        <React.Fragment>
                          <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                            {isInLendingMode ? "Total deposits" : "Total available"}
                          </Typography>
                          {isInLendingMode
                            ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                            : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                        </React.Fragment>
                      }
                      placement="top"
                    >
                      <Image src="/info_icon.png" alt="info" height={16} width={16} />
                    </HtmlTooltip>
                  </div>
                </TableCell>

                {/*******************************/}
                {/* [START]: ZOOM-BASED COLUMNS */}
                {/*******************************/}

                {lendZoomLevel < 2 && (
                  <TableCell
                    className="text-[#A1A1A1] text-sm border-none px-2 hidden xl:table-cell"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <div className="h-full w-full flex justify-end items-center gap-2">
                      Global limit
                      <HtmlTooltip
                        title={
                          <React.Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              {isInLendingMode ? "Global deposit cap" : "Global borrow cap"}
                            </Typography>
                            Each marginfi pool has global deposit and borrow limits, also known as caps. This is the
                            total amount that all users combined can deposit or borrow of a given token.
                          </React.Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </TableCell>
                )}

                {lendZoomLevel < 3 && (
                  <TableCell
                    className="text-[#A1A1A1] text-sm border-none px-2 hidden xl:table-cell"
                    style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                    align="right"
                  >
                    <div className="h-full w-full flex justify-end items-center gap-2">
                      Utilization
                      <HtmlTooltip
                        title={
                          <React.Fragment>
                            <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                              Pool utilization
                            </Typography>
                            What percentage of supplied tokens have been borrowed. This helps determine interest rates.
                            This is not based on the global pool limits, which can limit utilization.
                          </React.Fragment>
                        }
                        placement="top"
                      >
                        <Image src="/info_icon.png" alt="info" height={16} width={16} />
                      </HtmlTooltip>
                    </div>
                  </TableCell>
                )}

                {/*******************************/}
                {/* [END]: ZOOM-BASED COLUMNS */}
                {/*******************************/}

                <TableCell
                  className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                  style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                  align="right"
                >
                  <div className="h-full w-full flex justify-end items-center gap-2">Wallet Amt.</div>
                </TableCell>
                <TableCell className="border-none"></TableCell>
                <TableCell className="border-none"></TableCell>
              </TableHead>

              <TableBody>
                {sortedBanks
                  .filter((b) => !b.info.state.isIsolated)
                  .map((bank, i) =>
                    isStoreInitialized ? (
                      <AssetRow
                        key={bank.meta.tokenSymbol}
                        nativeSolBalance={nativeSolBalance}
                        bank={bank}
                        isInLendingMode={isInLendingMode}
                        isConnected={wallet.connected}
                        marginfiAccount={selectedAccount}
                        inputRefs={inputRefs}
                        hasHotkey={true}
                        showHotkeyBadges={showBadges}
                        badgeContent={`${i + 1}`}
                      />
                    ) : (
                      <LoadingAsset
                        key={bank.meta.tokenSymbol}
                        isInLendingMode={isInLendingMode}
                        bankMetadata={bank.meta}
                      />
                    )
                  )}
              </TableBody>
              <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white my-4 gap-2">
                <span className="gap-1 flex">
                  Isolated <span className="hidden lg:block">pools</span>
                </span>
                <HtmlTooltip
                  title={
                    <React.Fragment>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Isolated pools are risky ⚠️
                      </Typography>
                      Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you
                      cannot borrow other assets. Isolated pools should be considered particularly risky. As always,
                      remember that marginfi is a decentralized protocol and all deposited funds are at risk.
                    </React.Fragment>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </HtmlTooltip>
              </div>
              <TableBody>
                {sortedBanks
                  .filter((b) => b.info.state.isIsolated)
                  .map((bank) =>
                    isStoreInitialized ? (
                      <AssetRow
                        key={bank.meta.tokenSymbol}
                        nativeSolBalance={nativeSolBalance}
                        bank={bank}
                        isInLendingMode={isInLendingMode}
                        isConnected={wallet.connected}
                        marginfiAccount={selectedAccount}
                        inputRefs={inputRefs}
                        hasHotkey={false}
                      />
                    ) : (
                      <LoadingAsset
                        key={bank.meta.tokenSymbol}
                        isInLendingMode={isInLendingMode}
                        bankMetadata={bank.meta}
                      />
                    )
                  )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </div>
    </>
  );
};

export { AssetsList };
