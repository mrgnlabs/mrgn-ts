import React from "react";

import { IconApps, IconLoader, IconMenu2, IconShare2, IconSquarePlus, IconUpload } from "~/components/ui/icons";
import { BrowserTypes, useBrowser } from "~/hooks/useBrowser";
import { useOs } from "~/hooks/useOs";
import { ScreenWrapper, WalletSeperator } from "../../sharedComponents";
import { useIOSVersion } from "~/hooks/useIOSVersion";
import { AuthScreenProps } from "~/utils";

type PwaBrowserMap = {
  [browser in BrowserTypes]: StepCardProps[];
};

export const PwaBrowserMap: PwaBrowserMap = {
  Safari: [
    {
      icon: <IconShare2 />,
      title: "Step 1: Tap the Share Button",
      description: "At the bottom of the Safari screen, tap the share icon.",
    },
    {
      icon: <IconSquarePlus />,
      title: "Step 2: Select 'Add to Home Screen'",
      description:
        "Scroll through the list of options in the share menu until you find 'Add to Home Screen.' Tap on it.",
    },
    {
      icon: <IconApps />,
      title: "Step 3: Edit the Name (Optional)",
      description: "You will see a screen where you can edit the name of the PWA. Change the name if desired.",
    },
  ],
  Chrome: [
    {
      icon: <IconShare2 />,
      title: "Step 1: Tap the Share Button",
      description: "At the top right of the Chrome screen, tap the share icon.",
    },
    {
      icon: <IconSquarePlus />,
      title: "Step 2: Select 'Add to Home Screen'",
      description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
    },
    {
      icon: <IconApps />,
      title: "Step 3: Confirm the Name",
      description:
        "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
    },
  ],
  Opera: [
    {
      icon: <IconMenu2 />,
      title: "Step 1: Tap the Menu Button",
      description: "At the bottom right of the Opera screen, tap the menu icon.",
    },
    {
      icon: <IconShare2 />,
      title: "Step 2: Tap the Share Button",
      description: "At the bottom right in the drawer, tap the share icon.",
    },
    {
      icon: <IconSquarePlus />,
      title: "Step 3: Select 'Add to Home Screen'",
      description: "In the menu that appears, select 'Add to Home Screen.'",
    },
    {
      icon: <IconApps />,
      title: "Step 3: Confirm the Name",
      description:
        "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
    },
  ],
  Firefox: [
    {
      icon: <IconMenu2 />,
      title: "Step 1: Tap the Menu Button",
      description: "At the bottom right of the Firefox screen, tap the menu icon.",
    },
    {
      icon: <IconUpload />,
      title: "Step 2: Select 'Share'",
      description: "Scroll through the list of options in the menu until you find 'Share' Tap on it.",
    },
    {
      icon: <IconSquarePlus />,
      title: "Step 3: Select 'Add to Home Screen'",
      description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
    },
    {
      icon: <IconApps />,
      title: "Step 4: Confirm the Name",
      description:
        "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
    },
  ],
  Edge: [
    {
      icon: <IconMenu2 />,
      title: "Step 1: Tap the Menu Button",
      description: "At the bottom right of the Edge screen, tap the menu icon.",
    },
    {
      icon: <IconShare2 />,
      title: "Step 2: Select 'Share'",
      description: "Scroll through the list of options in the menu until you find 'Share' Tap on it.",
    },
    {
      icon: <IconSquarePlus />,
      title: "Step 3: Select 'Add to Home Screen'",
      description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
    },
    {
      icon: <IconApps />,
      title: "Step 4: Confirm the Name",
      description:
        "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
    },
  ],
  Brave: [
    // {
    //   icon: <IconDots />,
    //   title: "Step 1: Tap the Menu Button",
    //   description: "At the top right of the Brave screen, tap the three dots menu icon.",
    // },
    // {
    //   icon: <IconSquarePlus />,
    //   title: "Step 2: Select 'Add to Home Screen'",
    //   description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
    // },
    // {
    //   icon: <IconApps />,
    //   title: "Step 3: Confirm the Name",
    //   description:
    //     "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
    // },
  ],
  Phantom: [],
  Backpack: [],
  PWA: [],
};

const iosPwaBrowsers: BrowserTypes[] = ["Safari", "Chrome", "Edge", "Firefox"];

interface props extends AuthScreenProps {}

export const InstallPWA = ({ update }: props) => {
  const iosVersion = useIOSVersion();

  const isIOS16_3OrEarlier = React.useMemo(
    () =>
      iosVersion
        ? iosVersion.major < 16 ||
          (iosVersion.major === 16 && iosVersion.minor < 3) ||
          (iosVersion.major === 16 && iosVersion.minor === 3 && iosVersion.patch <= 0)
        : false,
    [iosVersion]
  );

  const browser = useBrowser();
  const { isIOS, isAndroid } = useOs();

  const isPwaAvailable = React.useMemo(() => {
    if (!browser) return false;
    if (isIOS) {
      if (isIOS16_3OrEarlier && browser === "Safari") return true;
      else if (!isIOS16_3OrEarlier && iosPwaBrowsers.includes(browser)) return true;
      else return false;
    } else if (isAndroid) {
      return true;
    } else {
      return false;
    }
  }, [isIOS, isAndroid, isIOS16_3OrEarlier, browser]);

  if (!browser) {
    return (
      <ScreenWrapper>
        <div className="m-auto">
          <IconLoader />
        </div>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <div className="space-y-4">
        {!isPwaAvailable && (
          <>
            <div className="text-lg text-primary">PWA is not supported on the current browser.</div>
            <p>For the best experience, please open our app in Safari and follow the instructions.</p>
          </>
        )}
        {isPwaAvailable &&
          PwaBrowserMap[browser].map((step, idx) => (
            <StepCard key={idx} icon={step.icon} title={step.title} description={step.description} />
          ))}
        <WalletSeperator description="skip for now" onClick={() => update("ONBOARD_SOCIAL")} />
      </div>
    </ScreenWrapper>
  );
};

interface StepCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

const StepCard = ({ icon, title, description }: StepCardProps) => {
  return (
    <div className="flex gap-2">
      <div className="text-primary">{icon}</div>
      <div>
        <dt className="text-primary">{title}</dt>
        <dd>{description}</dd>
      </div>
    </div>
  );
};
