import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@mrgnlabs/mrgn-ui/src/components/ui/dialog";
import { Skeleton } from "@mrgnlabs/mrgn-ui/src/components/ui/skeleton";
import { QrCode } from "../../../../components/common/QrCode/QrCode";

interface MixinModalProps {
  title: string;
  data?: string;
  isOpen: boolean;
  onClose: () => void;
  error?: string;
}

export function MixinModal(props: MixinModalProps) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="min-w-[320px]">
        <DialogHeader>
          <DialogTitle className="hidden">{props.title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center">
          <div className="w-[256px] h-[256px] rounded-xl overflow-hidden">
            {props.data ? <QrCode value={props.data} /> : <Skeleton className="w-full h-full rounded-lg" />}
          </div>
          <p className="mt-4 text-center">
            {props.error ? <span className="text-red-500">{props.error}</span> : "请使用 Mixin 扫码登录"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
