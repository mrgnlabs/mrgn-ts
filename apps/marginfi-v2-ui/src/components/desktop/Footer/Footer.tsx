import { FC, useEffect, useMemo, useState } from "react";
import { useUiStore, useUserProfileStore } from "~/store";
import Switch from "@mui/material/Switch";
import { useRouter } from "next/router";
import SvgIcon from "@mui/material/SvgIcon";
import TwitterIcon from "@mui/icons-material/Twitter";
import TelegramIcon from "@mui/icons-material/Telegram";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import InsightsIcon from "@mui/icons-material/Insights";
import Link from "next/link";
import { GitHub, QuestionMark } from "@mui/icons-material";
import { UserMode } from "~/types";

type FooterConfig = { hotkeys: boolean; zoom: boolean; unit: boolean; links: boolean; userMode: boolean };

const DISPLAY_TABLE: { [basePath: string]: FooterConfig } = {
  "/swap": { hotkeys: true, zoom: false, unit: false, links: true, userMode: true },
  "/bridge": { hotkeys: true, zoom: false, unit: false, links: true, userMode: true },
  "/earn": { hotkeys: true, zoom: false, unit: false, links: true, userMode: true },
};

const DEFAULT_FOOTER_CONFIG: FooterConfig = { hotkeys: true, zoom: false, unit: false, links: true, userMode: true };
const ROOT_CONFIG: FooterConfig = { hotkeys: true, zoom: true, unit: true, links: true, userMode: true };

const Footer: FC = () => {
  const router = useRouter();
  const [userMode] = useUiStore((state) => [state.userMode]);

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
    <footer>
      <div className="hidden sm:flex justify-between gap-4 fixed w-full bottom-0 h-[34px] z-20 bg-[#0F1111]  border-t border-[#4E5257]">
        <div className=" flex gap-4">
          {footerConfig.userMode && <UserModeControl />}
          {footerConfig.hotkeys && userMode === UserMode.PRO && <HotkeysInfo />}
          {footerConfig.unit && userMode === UserMode.PRO && <LendUnitControl />}
        </div>
        {footerConfig.links && <QuickLinks />}
      </div>
    </footer>
  );
};

const HotkeysInfo: FC = () => {
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    setIsMac(window.navigator.userAgent.includes("Mac"));
  }, []);

  return (
    <div className="text-[#868E95] text-sm whitespace-nowrap flex justify-center items-center border-r border-[#4E5257] pr-4 font-[500]">
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

const UserModeControl: FC = () => {
  const [userMode, setUserMode] = useUiStore((state) => [state.userMode, state.setUserMode]);

  return (
    <div className="text-[#868E95] text-sm whitespace-nowrap flex justify-center items-center border-r border-[#4E5257] px-6">
      <div className="h-full flex justify-center items-center font-medium">Lite</div>
      <Switch
        onChange={(_, checked) => setUserMode(checked ? UserMode.PRO : UserMode.LITE)}
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
            "& + .MuiSwitch-track": {
              backgroundColor: "#868E95",
            },
          },
        }}
        checked={userMode === UserMode.PRO}
      />
      <div className="h-full flex justify-center items-center font-medium">Pro</div>
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
  <div className="flex gap-4 items-center justify-center pt-1 border-l border-[#4E5257] px-4">
    <Link
      href="https://discord.gg/mrgn"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <svg fill="#868E95" width="23" height="21" className="cursor-pointer hover:fill-[#DCE85D]">
        <path d="M13.545 2.907a13.227 13.227 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.19 12.19 0 0 0-3.658 0 8.258 8.258 0 0 0-.412-.833.051.051 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.041.041 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032c.001.014.01.028.021.037a13.276 13.276 0 0 0 3.995 2.02.05.05 0 0 0 .056-.019c.308-.42.582-.863.818-1.329a.05.05 0 0 0-.01-.059.051.051 0 0 0-.018-.011 8.875 8.875 0 0 1-1.248-.595.05.05 0 0 1-.02-.066.051.051 0 0 1 .015-.019c.084-.063.168-.129.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.052.052 0 0 1 .053.007c.08.066.164.132.248.195a.051.051 0 0 1-.004.085 8.254 8.254 0 0 1-1.249.594.05.05 0 0 0-.03.03.052.052 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.235 13.235 0 0 0 4.001-2.02.049.049 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.034.034 0 0 0-.02-.019Zm-8.198 7.307c-.789 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612Zm5.316 0c-.788 0-1.438-.724-1.438-1.612 0-.889.637-1.613 1.438-1.613.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612Z"></path>
      </svg>
    </Link>
    <Link
      href="https://twitter.com/marginfi"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <TwitterIcon className="pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
    </Link>
    <Link
      href="https://docs.marginfi.com/"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <AutoStoriesOutlinedIcon className="pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
    </Link>
    <Link
      href="https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <InsightsIcon className="pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
    </Link>
    <Link
      href="https://github.com/mrgnlabs"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <GitHub className="pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
    </Link>
    <Link
      href="https://marginfi.canny.io/mrgnlend"
      target="_blank"
      rel="noopener noreferrer"
      className="p-0 m-0 h-full flex justify-center items-center"
    >
      <QuestionMark className="pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
    </Link>
  </div>
);

export { Footer };
