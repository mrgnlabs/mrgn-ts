"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "~/components/ui/dialog";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "~/components/ui/drawer";
import { Button } from "~/components/ui/button";
import { Desktop, Mobile } from "~/mediaQueryUtils";

import { DEPRECATION_COPY, DEPRECATION_PHASE, P0_APP_URL } from "./deprecation.config";

export const DeprecationDialog = () => {
  // Open on mount. Since this component is mounted in `_app.tsx`, it does not
  // remount on client-side route changes, so the modal won't re-appear on
  // page navigations — only on full page loads (refresh, new tab, direct link).
  const [isOpen, setIsOpen] = React.useState(true);
  const phase = DEPRECATION_PHASE;
  const copy = DEPRECATION_COPY[phase];
  const isDismissable = phase === 1;

  const handleClose = React.useCallback(() => {
    if (!isDismissable) return;
    setIsOpen(false);
  }, [isDismissable]);

  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      if (!open) {
        handleClose();
      }
    },
    [handleClose]
  );

  const blockEvent = React.useCallback((e: Event) => e.preventDefault(), []);

  const body = (
    <div className="relative flex flex-col items-center overflow-hidden bg-black">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 flex justify-center opacity-70">
        <Image
          src="/deprecation/orbits.svg"
          alt=""
          width={768}
          height={400}
          className="h-auto w-full max-w-none select-none"
          priority
        />
      </div>

      <div className="relative z-10 flex w-full flex-col items-center px-6 pt-16 pb-8 text-center sm:px-10 sm:pt-24">
        <Image
          src="/deprecation/icon-p0.png"
          alt="Project 0"
          width={120}
          height={120}
          className="mb-8 h-24 w-auto object-contain sm:h-28"
          priority
        />
        <h2 className="text-3xl font-medium tracking-tight text-white sm:text-4xl">{copy.title}</h2>
        <p className="mt-6 max-w-sm text-sm leading-relaxed text-white/70 sm:text-base">{copy.body}</p>
      </div>

      <div className="relative z-10 flex w-full flex-col items-center gap-3 bg-gradient-to-b from-transparent via-[#1a2a5e]/70 to-[#a78bfa] px-6 pt-4 pb-8 sm:px-10 sm:pt-6">
        <Button asChild className="w-full bg-white text-black shadow-lg hover:bg-white/90" size="lg">
          <Link href={P0_APP_URL} target="_blank" rel="noopener noreferrer">
            {copy.primaryCta}
          </Link>
        </Button>
        {isDismissable && copy.secondaryCta && (
          <Button variant="link" onClick={handleClose} className="text-white/80 underline hover:text-white">
            {copy.secondaryCta}
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <Desktop>
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
          <DialogContent
            size="xl"
            hidePadding
            hideClose={!isDismissable}
            className="overflow-hidden gap-0 border-white/10 bg-black p-0 md:max-w-xl"
            closeClassName="text-white/80 hover:text-white z-20"
            onEscapeKeyDown={!isDismissable ? blockEvent : undefined}
            onInteractOutside={!isDismissable ? blockEvent : undefined}
            onPointerDownOutside={!isDismissable ? blockEvent : undefined}
          >
            <DialogTitle className="sr-only">{copy.title}</DialogTitle>
            <DialogDescription className="sr-only">{copy.body}</DialogDescription>
            {body}
          </DialogContent>
        </Dialog>
      </Desktop>

      <Mobile>
        <Drawer open={isOpen} onOpenChange={handleOpenChange} dismissible={isDismissable}>
          <DrawerContent hideTopTrigger className="overflow-hidden border-white/10 bg-black p-0">
            <DrawerTitle className="sr-only">{copy.title}</DrawerTitle>
            <DrawerDescription className="sr-only">{copy.body}</DrawerDescription>
            {body}
          </DrawerContent>
        </Drawer>
      </Mobile>
    </>
  );
};
