import { ChevronLeft, LogoutOutlined } from "@mui/icons-material";
import { Link, Modal, Slide } from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/router";
import { FC } from "react";
import { EXTERNAL_QUICK_LINKS, NavLinkInfo, ORDERED_MOBILE_LAUNCHER_LINKS } from "~/config/navigationLinks";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useUiStore } from "~/store";

interface MenuModalProps {
  isOpen: boolean;
  handleClose: () => void;
}

export const MenuModal: FC<MenuModalProps> = ({ isOpen, handleClose }) => {
  const { connected, walletContextState } = useWalletContext();
  const [setIsMenuDrawerOpen] = useUiStore((state) => [state.setIsMenuDrawerOpen]);

  return (
    <Modal open={isOpen} onClose={handleClose} className="h-full">
      <Slide direction="right" in={isOpen} mountOnEnter unmountOnExit>
        <div className="absolute top-0 left-0 w-[70%] h-full bg-[#0F1111] p-4 bg-lines border-r-[1px] border-r-[#333]">
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
          <div className="h-[calc(100%-40px)] pb-9 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-3 p-7">
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
            <div className="w-full flex flex-col gap-4 justify-center items-center">
              <div className="w-4/5 flex flex-wrap gap-4 justify-center">
                {EXTERNAL_QUICK_LINKS.map((link, i) => (
                  <Link key={i} href={link.href} target="_blank" rel="noopener noreferrer" className="w-[24px] flex justify-center items-center">
                    <link.Icon className="w-full h-full pb-1 text-xl cursor-pointer hover:fill-[#DCE85D] text-[#868E95]" />
                  </Link>
                ))}
              </div>
              {connected && (
                <div
                  className="h-8 w-26 flex justify-center gap-1.5 items-center cursor-pointer bg-white rounded-md border-[1px] border-white transition hover:bg-transparent text-black text-base px-3 py-1"
                  onClick={() => {
                    walletContextState.disconnect();
                    setIsMenuDrawerOpen(false);
                  }}
                >
                  <LogoutOutlined sx={{ width: "16px" }} className="text-md" />
                  <span className="pb-[2px]">Sign out</span>
                </div>
              )}
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
        className={`w-full h-full flex flex-col justify-center items-center rounded-md bg-black border-[1px] ${
          isActive ? "border-[#DCE85D]" : "border-[#999]"
        }`}
      >
        <Icon className="w-[20px] h-[20px]" color={isActive ? "#DCE85D" : "#999"} />
        <div className={`font-aeonik font-[400] text-sm ${isActive ? "text-[#DCE85D]" : "text-[#999]"}`}>{label}</div>
      </button>
    </div>
  );
};
