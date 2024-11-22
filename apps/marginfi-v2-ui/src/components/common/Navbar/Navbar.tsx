import { FC } from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";
import { IconBell, IconBrandTelegram, IconSettings } from "@tabler/icons-react";

import { cn, capture } from "@mrgnlabs/mrgn-utils";
import { Settings, Wallet } from "@mrgnlabs/mrgn-ui";

import { useMrgnlendStore, useUiStore, useUserProfileStore } from "~/store";
import { useFirebaseAccount } from "~/hooks/useFirebaseAccount";

import { useConnection } from "~/hooks/use-connection";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { IconMrgn } from "~/components/ui/icons";

// @todo implement second pretty navbar row
export const Navbar: FC = () => {
  useFirebaseAccount();

  const { connection } = useConnection();
  const router = useRouter();
  const [
    initialized,
    userDataFetched,
    mfiClient,
    marginfiAccounts,
    selectedAccount,
    extendedBankInfos,
    nativeSolBalance,
    accountSummary,
    fetchMrgnlendState,
  ] = useMrgnlendStore((state) => [
    state.initialized,
    state.userDataFetched,
    state.marginfiClient,
    state.marginfiAccounts,
    state.selectedAccount,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.accountSummary,
    state.fetchMrgnlendState,
  ]);

  const { isOraclesStale, priorityType, broadcastType, maxCap, maxCapType, setTransactionSettings } = useUiStore(
    (state) => ({
      isOraclesStale: state.isOraclesStale,
      priorityType: state.priorityType,
      broadcastType: state.txBroadcastType,
      maxCap: state.maxCap,
      maxCapType: state.maxCapType,
      setTransactionSettings: state.setTransactionSettings,
    })
  );

  const [userPointsData] = useUserProfileStore((state) => [state.userPointsData]);

  return (
    <header className="h-[64px] mb-4 md:mb-8 lg:mb-14">
      <nav className={cn("fixed w-full top-0 h-[64px] z-50 bg-background", isOraclesStale && "top-16 md:top-10")}>
        <div className="w-full flex justify-between items-center h-16 text-sm font-[500] text-[#868E95] z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div className="h-full w-1/2 z-10 flex items-center gap-8">
            <Link
              href="/"
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center text-white"
            >
              <IconMrgn size={35} />
            </Link>

            <div className="hidden lg:flex justify-start items-center gap-8">
              <Link
                href={"/"}
                className={`${
                  router.pathname === "/" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }`}
              >
                lend
              </Link>

              <Link
                href={"/stake"}
                className={
                  router.pathname === "/stake" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                stake
              </Link>

              <Link
                href={"/looper"}
                className={
                  router.pathname === "/looper" ? "text-primary hover-underline-static" : "hover-underline-animation"
                }
              >
                looper
              </Link>

              <Link
                href={"/portfolio"}
                className={`${
                  router.pathname === "/portfolio" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                portfolio
              </Link>

              {/* {lipAccount && lipAccount.deposits.length > 0 && (
                <Link
                  href={"/earn"}
                  className={
                    router.pathname === "/earn" ? "text-primary hover-underline-static" : "hover-underline-animation"
                  }
                >
                  earn
                </Link>
              )} */}

              <Link
                href="/ecosystem"
                className={`${
                  router.pathname === "/ecosystem" ? "text-primary hover-underline-static" : "hover-underline-animation"
                } whitespace-nowrap`}
              >
                ecosystem
              </Link>
            </div>
          </div>
          {initialized && (
            <div className="h-full w-1/2 flex justify-end items-center z-10 gap-4 lg:gap-4 text-[#868E95]">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                    <IconBell size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <div className="flex flex-col items-center justify-center text-center gap-4">
                    <div className="flex flex-col items-center justify-center text-center gap-2">
                      <Image
                        src="https://storage.googleapis.com/mrgn-public/ecosystem-images/asgardwatchbot.jpg"
                        alt="Asgard Heimdall"
                        width={52}
                        height={52}
                        className="rounded-full"
                      />
                      <h2 className="text-lg font-medium">Asgard Watchbot</h2>
                      <p className="text-sm">
                        Sign up for real time notifications with Asgardfi&apos;s telegram watchbot.
                      </p>
                    </div>
                    <Link
                      href="https://t.me/AsgardWatchBot"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        capture("asgard_watchbot_clicked");
                      }}
                    >
                      <Button variant="secondary" size="sm">
                        <IconBrandTelegram size={18} /> Open in Telegram
                      </Button>
                    </Link>
                  </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0">
                    <IconSettings size={20} />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80">
                  <Settings
                    onChange={(settings) => setTransactionSettings(settings, connection)}
                    broadcastType={broadcastType}
                    priorityType={priorityType}
                    maxCap={maxCap}
                    maxCapType={maxCapType}
                  />
                </PopoverContent>
              </Popover>

              <Wallet
                connection={connection}
                initialized={initialized}
                userDataFetched={userDataFetched}
                mfiClient={mfiClient}
                marginfiAccounts={marginfiAccounts}
                selectedAccount={selectedAccount}
                extendedBankInfos={extendedBankInfos}
                nativeSolBalance={nativeSolBalance}
                userPointsData={userPointsData}
                accountSummary={accountSummary}
                refreshState={fetchMrgnlendState}
              />
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
