import { FC } from "react";

const MultipleAccountsFoundWarning: FC = () => {
  return (
    <div
      className={
        "col-span-full bg-[#515151] rounded-xl h-full flex flex-row justify-evenly items-start px-[4%] py-1 text-xl"
      }
    >
      Multiple accounts were found (not supported). Contact the team or use at
      own risk.
    </div>
  );
};

export { MultipleAccountsFoundWarning };
