import { FC } from "react";

interface PageHeaderProps {
  text?: string;
}

const PageHeader: FC<PageHeaderProps> = ({ text = "mrgnlend" }) => {
  return (
    <div className="hidden sm:flex w-full flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[64px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')]"
        }
      >
        {text}
      </div>
    </div>
  );
};


const PageHeaderSwap: FC = () => {
  return (
    <div className="hidden sm:flex w-full flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[64px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')] gap-1"
        }
      >
        swap
        <span className="text-sm h-[48px] pt-[32px] bg-white bg-clip-text text-transparent">
          Powered
        </span>
        {/* Different components here by word so spacing can be the same */}
        <span className="text-sm h-[48px] pt-[32px] bg-white bg-clip-text text-transparent">
          by
        </span>
        <span className="text-sm h-[48px] pt-[32px] bg-jup-gradient-colors bg-clip-text text-transparent">
          Jupiter
        </span>
      </div>
    </div>
  );
};

const PageHeaderBridge: FC = () => {
  return (
    <div className="hidden sm:flex w-full flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[64px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')] gap-1"
        }
      >
        bridge
        <span className="text-sm h-[48px] pt-[32px] bg-white bg-clip-text text-transparent">
          Powered
        </span>
        {/* Different components here by word so spacing can be the same */}
        <span className="text-sm h-[48px] pt-[32px] bg-white bg-clip-text text-transparent">
          by
        </span>
        <span className="text-sm mt-[6px] h-[54px] pt-[32px] bg-mayan-gradient-colors bg-clip-text text-transparent z-100">
          Mayan
        </span>
      </div>
    </div>
  );
};

export { PageHeader, PageHeaderSwap, PageHeaderBridge };
