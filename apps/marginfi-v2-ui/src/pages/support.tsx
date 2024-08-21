import React from "react";
import Script from "next/script";
import Link from "next/link";

import { IconQuestionMark, IconBook, IconSearch } from "@tabler/icons-react";

import { PageHeading } from "~/components/common/PageHeading";

const links = [
  {
    icon: <IconQuestionMark />,
    label: "FAQ",
    href: "https://docs.marginfi.com/faqs",
  },
  {
    icon: <IconSearch />,
    label: "User Guides",
    href: "https://docs.marginfi.com/#guides",
  },
  {
    icon: <IconBook />,
    label: "Docs",
    href: "https://docs.marginfi.com/",
  },
];

export default function SupportPage() {
  const initFrontChat = React.useCallback(() => {
    window.FrontChat("init", {
      chatId: process.env.NEXT_PUBLIC_FRONT_ID,
      useDefaultLauncher: true,
      shouldShowWindowOnLaunch: true,
    });
  }, []);

  return (
    <div className="h-full flex flex-col justify-start items-center content-start gap-4">
      <PageHeading
        heading="Help & Support"
        body={
          <p>
            Please see our documentation for answers to common questions, product user guides, or contact our support
            team directly below.
          </p>
        }
      />

      <div className="grid grid-cols-3 gap-8 w-full">
        {links.map((link) => (
          <Link
            href={link.href}
            className="flex flex-col justify-start items-center gap-2 bg-background-gray border border-border rounded-lg p-8 font-medium text-lg transition hover:bg-background-gray-light hover:scale-105"
          >
            {React.cloneElement(link.icon, {
              size: 28,
            })}
            {link.label}
          </Link>
        ))}
      </div>

      <Script id="front-chat-script" src="https://chat-assets.frontapp.com/v1/chat.bundle.js" onLoad={initFrontChat} />
    </div>
  );
}
