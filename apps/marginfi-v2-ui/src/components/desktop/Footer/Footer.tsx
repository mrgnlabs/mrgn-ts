import { FC, useEffect, useMemo, useState } from "react";
import { useUserProfileStore } from "~/store";
import Switch from "@mui/material/Switch";
import { useRouter } from "next/router";
import SvgIcon from "@mui/material/SvgIcon";
import Link from "next/link";
import { EXTERNAL_QUICK_LINKS } from "~/config/navigationLinks";

type FooterConfig = { hotkeys: boolean; zoom: boolean; unit: boolean; links: boolean };

const DISPLAY_TABLE: { [basePath: string]: FooterConfig } = {
  "/swap": { hotkeys: true, zoom: false, unit: false, links: true },
  "/bridge": { hotkeys: true, zoom: false, unit: false, links: true },
  "/earn": { hotkeys: true, zoom: false, unit: false, links: true },
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = { hotkeys: true, zoom: false, unit: false, links: true };
const ROOT_CONFIG: FooterConfig = { hotkeys: true, zoom: true, unit: true, links: true };

const Footer: FC = () => {
  const router = useRouter();

  const footerConfig = useMemo(() => {
    if (router.pathname === "/") return ROOT_CONFIG;

    const pageConfigKey = Object.keys(DISPLAY_TABLE).find((path) =>
      router.pathname.substring(1).startsWith(path.substring(1))
    );
    if (pageConfigKey) {
      return DISPLAY_TABLE[pageConfigKey];
    }

    return DEFAULT_FOOTER_CONFIG;
  }, [router.pathname]);

  return (
    <header>
      <div className="hidden sm:flex fixed w-full bottom-0 h-[34px] z-20 gap-4 bg-[#0F1111] border-t border-[#4E5257]">
        {footerConfig.hotkeys && <HotkeysInfo />}
        {footerConfig.zoom && <LendZoomControl />}
        {footerConfig.unit && <LendUnitControl />}
        {footerConfig.links && <QuickLinks />}
      </div>
    </header>
  );
};

const HotkeysInfo: FC = () => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(window.navigator.userAgent.includes("Mac"));
  }, []);

  return (
    <div className="text-[#868E95] text-sm whitespace-nowrap flex justify-center items-center border-r border-[#4E5257] px-4 font-[500]">
      {isMac ? "⌘" : "^"}+K to see hotkeys
    </div>
  );
};

const LendZoomControl: FC = () => {
  const [lendZoomLevel, setLendZoomLevel] = useUserProfileStore((state) => [
    state.lendZoomLevel,
    state.setLendZoomLevel,
  ]);

  return (
    <div className="flex gap-4 items-center justify-center border-r border-[#4E5257] pr-4">
      <div className="flex items-center h-full">
        <SvgIcon onClick={() => setLendZoomLevel(1)} viewBox="0 0 17 17">
          <svg
            fill="#868E95"
            className={`cursor-pointer ${lendZoomLevel === 1 && "fill-[#DCE85D]"} hover:fill-[#DCE85D] text-lg`}
          >
            <path
              strokeWidth={1.5}
              d="M1 1h3v3h-3v-3zM5 4h3v-3h-3v3zM9 4h3v-3h-3v3zM13 1v3h3v-3h-3zM1 8h3v-3h-3v3zM5 8h3v-3h-3v3zM9 8h3v-3h-3v3zM13 8h3v-3h-3v3zM1 12h3v-3h-3v3zM5 12h3v-3h-3v3zM9 12h3v-3h-3v3zM13 12h3v-3h-3v3zM1 16h3v-3h-3v3zM5 16h3v-3h-3v3zM9 16h3v-3h-3v3zM13 16h3v-3h-3v3z"
            />
          </svg>
        </SvgIcon>
      </div>
      <div className="flex items-center h-full">
        <SvgIcon onClick={() => setLendZoomLevel(2)} viewBox="0 0 16 16">
          <svg
            fill="#868E95"
            className={`cursor-pointer ${lendZoomLevel === 2 && "fill-[#DCE85D]"} hover:fill-[#DCE85D] text-lg`}
          >
            <path
              strokeWidth={1.5}
              d="M1 2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V2zM1 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V7zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V7zM1 12a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-2zm5 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2z"
            />
          </svg>
        </SvgIcon>
      </div>
      <div className="flex items-center h-full">
        <SvgIcon onClick={() => setLendZoomLevel(3)} viewBox="0 0 16 16">
          <svg
            fill="#868E95"
            className={`cursor-pointer ${lendZoomLevel === 3 && "fill-[#DCE85D]"} hover:fill-[#DCE85D] text-lg`}
          >
            <path
              strokeWidth={1.5}
              d="M1 2.5A1.5 1.5 0 0 1 2.5 1h3A1.5 1.5 0 0 1 7 2.5v3A1.5 1.5 0 0 1 5.5 7h-3A1.5 1.5 0 0 1 1 5.5v-3zm8 0A1.5 1.5 0 0 1 10.5 1h3A1.5 1.5 0 0 1 15 2.5v3A1.5 1.5 0 0 1 13.5 7h-3A1.5 1.5 0 0 1 9 5.5v-3zm-8 8A1.5 1.5 0 0 1 2.5 9h3A1.5 1.5 0 0 1 7 10.5v3A1.5 1.5 0 0 1 5.5 15h-3A1.5 1.5 0 0 1 1 13.5v-3zm8 0A1.5 1.5 0 0 1 10.5 9h3a1.5 1.5 0 0 1 1.5 1.5v3a1.5 1.5 0 0 1-1.5 1.5h-3A1.5 1.5 0 0 1 9 13.5v-3z"
            />
          </svg>
        </SvgIcon>
      </div>
    </div>
  );
};

const LendUnitControl: FC = () => {
  const [denomination, setDenominationUSD] = useUserProfileStore((state) => [
    state.denominationUSD,
    state.setDenominationUSD,
  ]);

  return (
    <div className="text-[#868E95] text-sm whitespace-nowrap flex justify-center items-center border-r border-[#4E5257] pr-6">
      <Switch
        onChange={(_, checked) => setDenominationUSD(checked)}
        sx={{
          color: "#868E95",
          "& .MuiSwitch-switchBase": {
            "&.Mui-checked": {
              "& .MuiSwitch-thumb": {
                backgroundColor: "#DCE85D",
              },
              "& + .MuiSwitch-track": {
                backgroundColor: "#DCE85D",
                color: "#DCE85D",
              },
            },
          },
        }}
        checked={denomination}
      />
      <div className="h-full flex justify-center items-center font-bold">Show $</div>
    </div>
  );
};

const QuickLinks: FC = () => (
  <div className="flex gap-4 items-center justify-center pt-1 border-r border-[#4E5257] pr-4">
    {EXTERNAL_QUICK_LINKS.map((link, i) => (
      <Link key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="w-[15px] flex justify-center items-center">
        <link.Icon className="w-full h-full pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
      </Link>
    ))}
  </div>
);

export { Footer };
