import { FC } from "react";

const PageHeader: FC = () => {
  return (
    <div className="hidden sm:flex w-full flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[64px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')]"
        }
      >
        mrgnlend
      </div>
    </div>
  );
};

const PageHeaderSwap: FC = () => {
  return (
    <div className="hidden sm:flex w-full flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[64px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')]"
        }
      >
        swap
        <span className="text-sm h-[48px] pt-[32px] bg-gradient-colors bg-clip-text text-transparent">Powered by Jupiter</span>
      </div>
    </div>
  );
};

export { PageHeader, PageHeaderSwap };
