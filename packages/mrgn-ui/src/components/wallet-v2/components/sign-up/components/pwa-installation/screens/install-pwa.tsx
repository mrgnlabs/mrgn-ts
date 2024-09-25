import React from "react";

import {
  IconApps,
  IconMenu2,
  IconShare2,
  IconSquarePlus,
  IconUpload,
  IconDotsVertical,
  IconDeviceMobileShare,
  IconCirclePlus,
  IconDeviceMobilePlus,
} from "@tabler/icons-react";

import { BrowserTypes, useBrowser } from "~/hooks/use-browser";
import { useOs } from "~/hooks/use-os";
import { useIOSVersion } from "~/hooks/use-ios-version";

import { AuthScreenProps } from "~/components/wallet-v2/components/sign-up/sign-up.utils";
import { ScreenWrapper } from "~/components/wallet-v2/components/sign-up/components";
import { IconLoader } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

type PwaBrowserMap = {
  [browser in BrowserTypes]: { android: StepCardProps[]; ios: StepCardProps[] };
};

export const pwaBrowserMap: PwaBrowserMap = {
  Safari: {
    android: [],
    ios: [
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
  },
  Chrome: {
    android: [
      {
        icon: <IconDotsVertical />,
        title: "Step 1: Tap the Settings Button",
        description: "At the top right of the Chrome screen, tap the settings icon.",
      },
      {
        icon: <IconDeviceMobileShare />,
        title: "Step 2: Select 'Add to Home Screen'",
        description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
      },
      {
        icon: <IconApps />,
        title: "Step 3: Create Shortcut",
        description:
          "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
      },
    ],
    ios: [
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
  },
  Opera: {
    android: [
      {
        icon: <IconDotsVertical />,
        title: "Step 1: Tap the Settings Button",
        description: "At the top right of the Opera screen, tap the settings icon.",
      },
      {
        icon: <IconCirclePlus />,
        title: "Step 2: Select 'Add to...'",
        description: "Scroll through the list of options in the menu until you find 'Add to...' Tap on it.",
      },
      {
        icon: <IconSquarePlus />,
        title: "Step 3: Select 'Home Screen'",
        description: "In the menu that appears, select 'Home Screen.'",
      },
      {
        icon: <IconApps />,
        title: "Step 4: Add to Home Screen",
        description:
          "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
      },
    ],
    ios: [
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
  },
  Firefox: {
    android: [
      {
        icon: <IconDotsVertical />,
        title: "Step 1: Tap the Settings Button",
        description: "At the top right of the Firefox screen, tap the settings icon.",
      },
      {
        icon: <IconDeviceMobileShare />,
        title: "Step 2: Select 'Add to Home Screen'",
        description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
      },
      {
        icon: <IconApps />,
        title: "Step 3: Create Shortcut",
        description:
          "You will see a screen where you can touch & hold the widget to move it around. Press 'Add to home screen' to confirm.",
      },
    ],
    ios: [
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
  },
  Edge: {
    android: [
      {
        icon: <IconMenu2 />,
        title: "Step 1: Tap the Menu Button",
        description: "At the bottom right of the Edge screen, tap the menu icon.",
      },
      {
        icon: <IconDeviceMobilePlus />,
        title: "Step 2: Select 'Add to phone'",
        description: "Scroll through the list of options in the menu until you find 'Add to phone' Tap on it.",
      },
      {
        icon: <IconApps />,
        title: "Step 3: Create Shortcut",
        description:
          "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
      },
    ],
    ios: [
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
  },
  Brave: {
    android: [
      {
        icon: <IconDotsVertical />,
        title: "Step 1: Tap the Settings Button",
        description: "At the bottom right of the Brave screen, tap the three dots settings icon.",
      },
      {
        icon: <IconSquarePlus />,
        title: "Step 2: Select 'Add to Home Screen'",
        description: "Scroll through the list of options in the menu until you find 'Add to Home Screen.' Tap on it.",
      },
      {
        icon: <IconApps />,
        title: "Step 3: Create shortcut",
        description:
          "You will see a screen where you can edit the name of the PWA. Change the name if desired and tap 'Add' to confirm.",
      },
    ],
    ios: [],
  },
  Phantom: { android: [], ios: [] },
  Backpack: { android: [], ios: [] },
  PWA: { android: [], ios: [] },
  Solflare: {
    android: [],
    ios: [],
  },
};

const iosPwaBrowsers: BrowserTypes[] = ["Safari", "Chrome", "Edge", "Firefox"];
const androidPwaBrowsers: BrowserTypes[] = ["Chrome", "Opera", "Edge", "Firefox", "Brave"];

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
      if (androidPwaBrowsers.includes(browser)) return true;
      else return false;
    } else {
      return false;
    }
  }, [isIOS, isAndroid, isIOS16_3OrEarlier, browser]);

  const pwaBrowser = React.useMemo(() => {
    if (!browser) return false;

    if (isIOS) return pwaBrowserMap[browser].ios;
    else return pwaBrowserMap[browser].android;
  }, [browser, isAndroid, isAndroid]);

  if (!browser || !pwaBrowser) {
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
      <div className="space-y-6 py-2">
        {!isPwaAvailable && (
          <>
            <div className="text-lg text-primary">PWA is not supported on the current browser.</div>
            <p>
              For the best experience, please open our app in {isIOS ? "Safari" : "Chrome"} and follow the instructions.
            </p>
          </>
        )}
        {isPwaAvailable &&
          pwaBrowser.map((step, idx) => (
            <StepCard key={idx} icon={step.icon} title={step.title} description={step.description} />
          ))}
      </div>
      <Button className="w-full" variant="outline" size={"sm"} onClick={() => update("ONBOARD_SOCIAL")}>
        Skip for now
      </Button>
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
