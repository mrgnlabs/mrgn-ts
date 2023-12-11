import { ChevronLeft, GitHub, QuestionMark } from "@mui/icons-material";
import { Link, Modal, Slide } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/router";
import { FC } from "react";
import { NavLinkInfo, ORDERED_MOBILE_LAUNCHER_LINKS } from "~/config/navigationLinks";
import TwitterIcon from "@mui/icons-material/Twitter";
import TelegramIcon from "@mui/icons-material/Telegram";
import AutoStoriesOutlinedIcon from "@mui/icons-material/AutoStoriesOutlined";
import InsightsIcon from "@mui/icons-material/Insights";

interface MenuModalProps {
  isOpen: boolean;
  handleClose: () => void;
}

export const MenuModal: FC<MenuModalProps> = ({ isOpen, handleClose }) => {
  return (
    <Modal open={isOpen} onClose={handleClose} className="h-full">
      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <div className="absolute top-0 left-0 w-[70%] h-full bg-[#0F1111] p-4 border-r-[1px] border-r-[#333]">
          <div className="h-[40px] flex flex-row justify-between mb-3">
            <Link
              href={"https://app.marginfi.com"}
              className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center"
            >
              <Image src="/marginfi_logo.png" alt="marginfi logo" height={35.025} width={31.0125} />
            </Link>
            <div className="flex items-center cursor-pointer" onClick={handleClose}>
              <ChevronLeft />
            </div>
          </div>
          <div className="h-[calc(100%-40px)] flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3 p-4">
              {ORDERED_MOBILE_LAUNCHER_LINKS.map((link) => (
                <AppLink
                  key={link.href}
                  href={link.href}
                  label={link.label}
                  alt={link.alt}
                  Icon={link.Icon}
                  onClick={handleClose}
                />
              ))}
            </div>
            <div className="w-full flex flex-col justify-center items-center">
              <div className="w-full h-[30px] flex flex-row justify-between gap-2 items-center">
                <Link
                  href="https://discord.gg/mrgn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0 pl-2 m-0 h-full flex justify-center items-center"
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
                  <TwitterIcon className="pb-1 text-2xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                </Link>
                <Link
                  href="https://docs.marginfi.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0 m-0 h-full flex justify-center items-center"
                >
                  <AutoStoriesOutlinedIcon className="pb-1 text-2xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                </Link>
                <Link
                  href="https://mrgn.grafana.net/public-dashboards/a2700f1bbca64aeaa5582a90dbaeb276?orgId=1&refresh=1m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0 m-0 h-full flex justify-center items-center"
                >
                  <InsightsIcon className="pb-1 text-2xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                </Link>
                <Link
                  href="https://github.com/mrgnlabs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0 m-0 h-full flex justify-center items-center"
                >
                  <GitHub className="pb-1 text-2xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                </Link>
                <Link
                  href="https://marginfi.canny.io/mrgnlend"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0 m-0 h-full flex justify-center items-center"
                >
                  <QuestionMark className="pb-1 text-2xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </Slide>
    </Modal>
  );
};

const AppLink: FC<NavLinkInfo & { onClick?: () => void }> = ({ href, label, Icon, alt, onClick }) => {
  const router = useRouter();
  const isActive = router.pathname === href;

  return (
    <div className="w-full h-[70px]">
      <button
        onClick={() => {
          router.push(href);
          if (onClick) onClick();
        }}
        className={`w-full h-full flex flex-col justify-center items-center rounded-md border-[1px] ${
          isActive ? "border-[#DCE85D] text-[#DCE85D]" : "border-[#999] text-[#999]"
        }`}
      >
        <Icon />
        <div className={`font-aeonik font-[400] text-sm ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>{label}</div>
      </button>
    </div>
  );
};
