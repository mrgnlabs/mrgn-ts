interface MrgnLabeledSwitchProps {
  labelLeft: string;
  labelRight: string;
  checked: boolean;
  onClick: () => void;
  disabled?: boolean;
  trackColor?: string;
  thumbColor?: string;
}

const MrgnLabeledSwitch = ({
  checked,
  onClick,
  disabled,
  labelLeft,
  labelRight,
  trackColor,
  thumbColor,
}: MrgnLabeledSwitchProps) => {
  return (
    <div
      className={`relative w-full h-full flex flex-row items-center ${
        trackColor ? `bg-[${trackColor}]` : "bg-[#22282C]"
      } rounded-[4px] ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      onClick={() => {
        if (!disabled) onClick();
      }}
    >
      <div className="absolute flex items-center top-0 left-0 w-1/2 h-full bg-transparent">
        <div
          className={`w-full h-full flex justify-center items-center p-1 transition-transform duration-200 ease-in-out ${
            checked ? "translate-x-full" : ""
          }`}
        >
          <div className={`w-full h-full ${thumbColor ? `bg-[${thumbColor}]` : "bg-[#131618]"} rounded-[4px]`} />
        </div>
      </div>
      <div className="w-1/2 h-full flex justify-center items-center text-white text-normal font-[500] bg-transparent z-20">
        {labelLeft}
      </div>
      <div className="w-1/2 h-full flex justify-center items-center text-white text-normal font-[500] bg-transparent z-20">
        {labelRight}
      </div>
    </div>
  );
};

export { MrgnLabeledSwitch };
