import { FC, ReactNode } from "react";

interface PageHeaderProps {
  children: ReactNode;
}

const PageHeader: FC<PageHeaderProps> = ({ children }) => {
  return (
    <div className="hidden sm:flex w-full h-[60px] justify-center items-center border-solid border-[#1C2125] border-y-[1px] bg-[url('/WaveBG3.png')]">
      <div className="w-4/5 max-w-7xl flex-row border-solid font-aeonik font-normal text-3xl">{children}</div>
    </div>
  );
};

export { PageHeader };
