import { Dialog, DialogContent } from "@mui/material";

export enum LSTDialogVariants {
  SOL = "SOL",
  stSOL = "stSOL",
}

type LSTDialogProps = {
  variant: LSTDialogVariants | null,
  open: boolean,
  onClose: () => void,
}

const LSTDialog = ({variant, open, onClose}:LSTDialogProps) => {
  return (
    <Dialog open={open} onClose={onClose}>
      <DialogContent className="bg-black">
        {variant === LSTDialogVariants.SOL && <p>SOL!</p>}
        {variant === LSTDialogVariants.stSOL && <p>stSOL!</p>}
      </DialogContent>
    </Dialog>
  )
}

export { LSTDialog }