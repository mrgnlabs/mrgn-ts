import { FC, ReactNode } from "react";
import { WalletButton } from "../common/Navbar";

interface PageHeaderProps {
  children: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  return (
    <div className="flex w-full h-[60px] justify-center items-center border-solid border-[#1C2125] border-y-[1px] bg-[url('/WaveBG3.png')]">
      <div className="w-[90%] sm:w-4/5 sm:max-w-7xl flex flex-row justify-between items-center border-solid font-aeonik font-normal text-3xl">
        <div>{children}</div>
        <div className="sm:hidden"><WalletButton /></div>
      </div>
    </div>
  );
};

export { PageHeader };
