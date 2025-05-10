import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@mrgnlabs/mrgn-ui/src/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  type: "deploy";
  title: string;
  description?: string;
  handleCompleted: () => void;
}

export default function ComputerWaiting(props: Props) {
  const { isOpen, handleCompleted } = props;
  useEffect(() => {
    if (!isOpen) return;
    handleCompleted();
    const id = setInterval(() => {
      handleCompleted();
    }, 5 * 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="min-w-[320px] min-h-[64px]">
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogClose />
        </DialogHeader>
        <div className="w-[256px] h-[64px] flex justify-center items-center">{props.title}</div>
      </DialogContent>
    </Dialog>
  );
}
