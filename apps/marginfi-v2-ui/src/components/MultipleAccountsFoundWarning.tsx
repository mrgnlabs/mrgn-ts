import { FC } from "react";
import MarginfiAccount from "@mrgnlabs/marginfi-client-v2/src/account";
import { shortenAddress } from "@mrgnlabs/marginfi-client-v2";
import { computeAccountSummary } from "~/api";
import { useTokenMetadata } from "~/context";
import { usdFormatter } from "~/utils/formatters";
import Link from "next/link";

const MultipleAccountsFoundWarning: FC<{ userAccounts: MarginfiAccount[] }> = ({ userAccounts }) => {
  const { tokenMetadataMap } = useTokenMetadata();
  return (
    <div
      className={
        "col-span-full bg-[#515151] rounded-xl h-full flex flex-col justify-evenly items-start px-[4%] py-1 text-xl"
      }
    >
      Multiple accounts were found (not supported). Contact the team or use at own risk.
      <div className={"col-span-full flex flex-col justify-evenly items-start pl-8 pt-2"}>
        {userAccounts.map((account) => {
          const accountSummary = computeAccountSummary(account, tokenMetadataMap);
          return (
            <div key={account.publicKey.toBase58()} className="flex flex-row">
              <span>-</span>
              <span className="w-[150px] pl-[10px]">
                <Link href={`/account/${account.publicKey.toBase58()}`} className="text-blue-300 underline">
                  {shortenAddress(account.publicKey)}
                </Link>
              </span>{" "}
              {usdFormatter.format(accountSummary.balance)}
            </div>
          );
        })}
      </div>
    </div>
  );
};
export { MultipleAccountsFoundWarning };
