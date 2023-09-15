import { FC, ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  return (
    <div className="hidden h-[64px] sm:flex justify-start content-start items-center w-4/5 max-w-7xl flex-row border-solid border-[#1C2125] border-y-[1px] font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')]">
      {children}
    </div>
  );
};

export { PageHeader };
