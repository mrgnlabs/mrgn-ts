import { LendingModes, PoolTypes } from "~/types";

import React, { FC, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useHotkeys } from "react-hotkeys-hook";
import { Card, Table, TableHead, TableBody, TableContainer, TableCell, TableRow } from "@mui/material";
import Typography from "@mui/material/Typography";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { cn } from "~/utils";

import { LoadingAsset, AssetRow } from "./AssetRow";
import { LSTDialog, LSTDialogVariants, NewAssetBannerList } from "~/components/common/AssetList";
import { MrgnTooltip, MrgnLabeledSwitch, MrgnContainedSwitch } from "~/components/common";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";

const AssetsList: FC = () => {
  // const { selectedAccount, nativeSolBalance } = useStore();
  const { connected } = useWalletContext();
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
  const [lendingMode, setLendingMode, poolFilter, setPoolFilter, setIsWalletAuthDialogOpen] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.poolFilter,
    state.setPoolFilter,
    state.setIsWalletAuthDialogOpen,
  ]);

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isHotkeyMode, setIsHotkeyMode] = useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = useState<(() => void) | null>(null);
  const [isFiltered, setIsFiltered] = useState(false);
  const togglePositions = () => setIsFiltered((previousState) => !previousState);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);

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
        setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
        setIsHotkeyMode(false);
        setShowBadges(false);
      }
    },
    { enableOnFormTags: true }
  );

  // Hack required to circumvent rehydration error
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);
  if (!hasMounted) {
    return null;
  }

  return (
    <>
      <div className="col-span-full w-full space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex w-[150px] h-[42px]">
            <MrgnLabeledSwitch
              labelLeft="Lend"
              labelRight="Borrow"
              checked={lendingMode === LendingModes.BORROW}
              onClick={() =>
                setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND)
              }
            />
          </div>
          <div className="flex items-center gap-2">
            Filter pools
            <Select
              value={poolFilter}
              onValueChange={(value) => {
                setPoolFilter(value as PoolTypes);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue defaultValue="allpools" placeholder="Select pools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All pools</SelectItem>
                <SelectItem value="global">Global pool</SelectItem>
                <SelectItem value="isolated">Isolated pools</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div
          className={cn("flex items-center gap-1", !connected && "opacity-50")}
          onClick={(e) => {
            e.stopPropagation();
            if (connected) return;
            setIsWalletAuthDialogOpen(true);
          }}
        >
          <MrgnContainedSwitch
            checked={isFiltered}
            onChange={togglePositions}
            inputProps={{ "aria-label": "controlled" }}
            className={cn(!connected && "pointer-events-none")}
          />
          <div>Filter my positions</div>
        </div>

        <NewAssetBannerList
          assets={[
            {
              asset: "pyth",
              image: "https://pyth.network/token.svg",
            },
            {
              asset: "shdw",
              image:
                "https://shdw-drive.genesysgo.net/FDcC9gn12fFkSU2KuQYH4TUjihrZxiTodFRWNF4ns9Kt/250x250_with_padding.png",
            },
          ]}
        />
      </div>

      <div className="col-span-full">
        <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
          <TableContainer>
            {poolFilter !== "isolated" && (
              <Table
                className="table-fixed"
                style={{
                  borderCollapse: "separate",
                  borderSpacing: "0px 8px",
                }}
              >
                <TableHead>
                  <TableRow>
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
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                Realtime prices
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                Powered by Pyth and Switchboard.
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "APY" : "APR"}
                        <MrgnTooltip
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
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "Weight" : "LTV"}
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                {isInLendingMode ? "Weight" : "LTV"}
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                {isInLendingMode
                                  ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                                  : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "Deposits" : "Available"}
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                {isInLendingMode ? "Total deposits" : "Total available"}
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                {isInLendingMode
                                  ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                                  : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
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
                          <MrgnTooltip
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
                          </MrgnTooltip>
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
                          <MrgnTooltip
                            title={
                              <React.Fragment>
                                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                  Pool utilization
                                </Typography>
                                What percentage of supplied tokens have been borrowed. This helps determine interest
                                rates. This is not based on the global pool limits, which can limit utilization.
                              </React.Fragment>
                            }
                            placement="top"
                          >
                            <Image src="/info_icon.png" alt="info" height={16} width={16} />
                          </MrgnTooltip>
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
                  </TableRow>
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
                          isConnected={connected}
                          marginfiAccount={selectedAccount}
                          inputRefs={inputRefs}
                          hasHotkey={true}
                          showHotkeyBadges={showBadges}
                          badgeContent={`${i + 1}`}
                          showLSTDialog={(variant: LSTDialogVariants, onClose?: () => void) => {
                            setLSTDialogVariant(variant);
                            setIsLSTDialogOpen(true);
                            if (onClose) {
                              setLSTDialogCallback(() => onClose);
                            }
                          }}
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
            )}
            {poolFilter !== "global" && (
              <Table className="table-fixed" style={{ borderCollapse: "separate", borderSpacing: "0px 8px" }}>
                <TableHead>
                  <TableRow>
                    <TableCell className="text-white border-none p-0">
                      <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white my-4 gap-2">
                        <span className="gap-1 flex">
                          Isolated <span className="hidden lg:block">pools</span>
                        </span>
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                Isolated pools are risky ⚠️
                              </Typography>
                              Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset,
                              you cannot borrow other assets. Isolated pools should be considered particularly risky. As
                              always, remember that marginfi is a decentralized protocol and all deposited funds are at
                              risk.
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        Price
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                Realtime prices
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                Powered by Pyth and Switchboard.
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "APY" : "APR"}
                        <MrgnTooltip
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
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden md:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "Weight" : "LTV"}
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                {isInLendingMode ? "Weight" : "LTV"}
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                {isInLendingMode
                                  ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                                  : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
                      </div>
                    </TableCell>
                    <TableCell
                      className="text-[#A1A1A1] text-sm border-none px-2 hidden lg:table-cell"
                      style={{ fontFamily: "Aeonik Pro", fontWeight: 300 }}
                      align="right"
                    >
                      <div className="h-full w-full flex justify-end items-center gap-2">
                        {isInLendingMode ? "Deposits" : "Available"}
                        <MrgnTooltip
                          title={
                            <React.Fragment>
                              <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                {isInLendingMode ? "Total deposits" : "Total available"}
                              </Typography>
                              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                                {isInLendingMode
                                  ? "Total marginfi deposits for each asset. Everything is denominated in native tokens."
                                  : "The amount of tokens available to borrow for each asset. Calculated as the minimum of the asset's borrow limit and available liquidity that has not yet been borrowed."}
                              </span>
                            </React.Fragment>
                          }
                          placement="top"
                        >
                          <Image src="/info_icon.png" alt="info" height={16} width={16} />
                        </MrgnTooltip>
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
                          <MrgnTooltip
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
                          </MrgnTooltip>
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
                          <MrgnTooltip
                            title={
                              <React.Fragment>
                                <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                                  Pool utilization
                                </Typography>
                                What percentage of supplied tokens have been borrowed. This helps determine interest
                                rates. This is not based on the global pool limits, which can limit utilization.
                              </React.Fragment>
                            }
                            placement="top"
                          >
                            <Image src="/info_icon.png" alt="info" height={16} width={16} />
                          </MrgnTooltip>
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
                  </TableRow>
                </TableHead>
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
                          isConnected={connected}
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
            )}
          </TableContainer>
        </Card>
      </div>

      <LSTDialog
        variant={lstDialogVariant}
        open={isLSTDialogOpen}
        onClose={() => {
          setIsLSTDialogOpen(false);
          setLSTDialogVariant(null);
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
      />
    </>
  );
};

export { AssetsList };
