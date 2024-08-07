import Link from "next/link";

import { IconConfetti } from "@tabler/icons-react";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { Button } from "~/components/ui/button";

import { BankToken } from "./tokenSeeds";

type CreatePoolSuccessProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  goBack: () => void;
  poolCreatedData: BankToken;
};

export const CreatePoolSuccess = ({ poolCreatedData, setIsOpen, goBack }: CreatePoolSuccessProps) => {
  return (
    <div className="flex flex-col justify-center items-center gap-12">
      <div className="text-center space-y-12">
        <div className="flex flex-col items-center gap-3">
          <IconConfetti size={48} />
          <h2 className="text-3xl font-medium">Pool created!</h2>
          <p className="text-muted-foreground">
            Your pool has been created. It will be verified before it shows on mrgntrade.
          </p>
        </div>
        {poolCreatedData && (
          <div className="flex flex-col items-center justify-center gap-3 mt-8">
            <h1 className="font-medium text-xl">{poolCreatedData.tag}</h1>
            <Link
              href={`https://solscan.io/account/${poolCreatedData.token}`}
              target="_blank"
              rel="noreferrer"
              className="text-mrgn-chartreuse border-b border-mrgn-chartreuse transition-colors hover:border-transparent"
            >
              {shortenAddress(poolCreatedData.token)}
            </Link>
          </div>
        )}
      </div>
      <Button onClick={() => goBack()}>Continue</Button>
    </div>
  );
};
