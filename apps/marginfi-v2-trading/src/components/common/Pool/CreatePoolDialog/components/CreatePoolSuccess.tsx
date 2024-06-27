import Image from "next/image";
import Link from "next/link";

import { IconConfetti } from "@tabler/icons-react";

import { shortenAddress } from "@mrgnlabs/mrgn-common";

import { Button } from "~/components/ui/button";

import { FormValues } from "~/components/common/Pool/CreatePoolDialog";

type CreatePoolSuccessProps = {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  poolCreatedData: FormValues | null;
};

export const CreatePoolSuccess = ({ poolCreatedData, setIsOpen }: CreatePoolSuccessProps) => {
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
            <Image
              src={poolCreatedData.imageUpload || poolCreatedData.imageDownload!}
              alt={`${poolCreatedData.symbol} image`}
              width={64}
              height={64}
              className="rounded-full"
            />
            <h1 className="font-medium text-xl">
              {poolCreatedData.name} <span className="font-normal">({poolCreatedData.symbol})</span>
            </h1>
            <Link
              href={`https://solscan.io/account/${poolCreatedData.mint}`}
              target="_blank"
              rel="noreferrer"
              className="text-mrgn-chartreuse border-b border-mrgn-chartreuse transition-colors hover:border-transparent"
            >
              {shortenAddress(poolCreatedData.mint)}
            </Link>
          </div>
        )}
      </div>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </div>
  );
};
