import React from "react";

import { useOs } from "~/hooks/useOs";

import { IconShare2, IconX } from "~/components/ui/icons";

export const PWABanner = () => {
  const [open, setOpen] = React.useState(false);
  const { isIOS, isPWA } = useOs();

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem("mrgnPwaBannerDismissed", "true");
  };

  React.useEffect(() => {
    if (!localStorage.getItem("mrgnPwaBannerDismissed")) {
      setOpen(true);
    }
  }, []);

  if (!open || !isIOS || isPWA) return null;

  return (
    <div className="relative pl-4 pr-8 py-2 bg-chartreuse text-background">
      <p>
        <strong className="font-medium">Install the mrgnmobile app</strong>. Open in a browser,
        <br /> tap share
        <IconShare2 size={16} className="inline relative -translate-y-0.5" />, and add to home screen.
      </p>
      <button className="absolute top-0 right-0 p-3" onClick={() => handleClose()}>
        <IconX size={16} />
      </button>
    </div>
  );
};
