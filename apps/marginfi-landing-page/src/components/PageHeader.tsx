import { FC } from "react";

const PageHeader: FC = () => {
  return (
    <div className="w-full flex flex-row justify-center border-solid border-[#1C2125] border-y-[1px]">
      <div
        className={
          "h-[80px] w-full w-[90%] max-w-7xl pl-[60px] flex flex-row items-center py-1 font-aeonik font-normal text-3xl bg-[url('/WaveBG3.png')]"
        }
      >
        mrgnlend
      </div>
    </div>
  );
};

export { PageHeader };
