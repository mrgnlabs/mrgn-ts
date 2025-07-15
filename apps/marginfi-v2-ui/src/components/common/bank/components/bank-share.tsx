import React from "react";
import Link from "next/link";
import { CopyToClipboard } from "react-copy-to-clipboard";

import {
  IconCopy,
  IconCheck,
  IconShare,
  IconBrandXFilled,
  IconBrandTelegram,
  IconBrandWhatsapp,
  IconBrandReddit,
} from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";

import { Popover, PopoverContent, PopoverTrigger } from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

const shareLinks = [
  {
    icon: IconBrandXFilled,
    url: "https://twitter.com/intent/tweet?url={url}&text={text}",
  },
  {
    icon: IconBrandTelegram,
    url: "https://t.me/share/url?url={url}&text={text}",
  },
  {
    icon: IconBrandWhatsapp,
    url: "https://wa.me/?text={text}%20-%20{url}",
  },
  {
    icon: IconBrandReddit,
    url: "https://reddit.com/submit/?url={url}&amp;resubmit=true&amp;title={text}",
  },
];

const buildShareUrl = (link: string, url: string, text: string) => {
  return link.replace("{url}", url).replace("{text}", text);
};

type BankShareProps = {
  bank: ExtendedBankInfo;
};

export const BankShare = ({ bank }: BankShareProps) => {
  const [isUrlCopied, setIsUrlCopied] = React.useState(false);
  const copyUrlRef = React.useRef<HTMLInputElement>(null);

  const handleCopyUrl = () => {
    setIsUrlCopied(true);
    setTimeout(() => {
      setIsUrlCopied(false);
    }, 2000);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="secondary">
                  <IconShare size={16} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Share {bank.meta.tokenSymbol} bank</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </PopoverTrigger>
      <PopoverContent className="pb-2">
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center gap-1.5">
            <input
              ref={copyUrlRef}
              className="appearance-none text-xs bg-background border rounded-md w-full overflow-auto px-2 py-1 select-all outline-none"
              value={`${window.location.origin}/banks/${bank.address.toBase58()}`}
              readOnly
            />
            <CopyToClipboard text={`${window.location.origin}/banks/${bank.address.toBase58()}`}>
              <button
                onClick={handleCopyUrl}
                className="cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
              >
                {isUrlCopied ? <IconCheck size={16} /> : <IconCopy size={16} />}
              </button>
            </CopyToClipboard>
          </div>
          <div className="flex items-center gap-2 text-xs pl-0.5">
            <span className="-translate-y-0.5 font-medium">Share to:</span>
            <ul className="flex items-center justify-center gap-1">
              {shareLinks.map((link, index) => {
                const url = `${window.location.origin}/banks/${bank.address.toBase58()}`;
                const text = `Lend and borrow ${bank.meta.tokenSymbol} on marginfi`;
                return (
                  <li key={index}>
                    <Link
                      href={buildShareUrl(link.url, url, text)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block cursor-pointer rounded-md p-2 transition-colors hover:bg-accent"
                    >
                      <link.icon size={16} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
