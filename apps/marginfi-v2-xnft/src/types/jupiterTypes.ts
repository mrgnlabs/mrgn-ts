import { SwapMode } from "@jup-ag/react-hook";

export interface FormProps {
  swapMode?: SwapMode;
  initialAmount?: string;
  fixedAmount?: boolean;
  initialInputMint?: string;
  fixedInputMint?: boolean;
  initialOutputMint?: string;
  fixedOutputMint?: boolean;
}
