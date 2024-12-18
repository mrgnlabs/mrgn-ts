import { ArenaPoolV2Extended } from "~/types/trade-store.types";

export interface PnlDisplayProps {
  pool: ArenaPoolV2Extended;
  onDialogOpenChange?: (open: boolean) => void;
}
