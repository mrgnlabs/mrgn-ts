import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@mrgnlabs/mrgn-ui/src/components/ui/dialog";
import { useEffect, useState } from "react";
import { useAppStore } from "../../../../store";
import { ComputerSystemCallRequest } from "@mrgnlabs/mrgn-utils";
import { QrCode } from "../../../../components/common/QrCode/QrCode";

interface MixinModalProps {
  requests: ComputerSystemCallRequest[];
  isOpen: boolean;
  onClose: () => void;
}

export function MixinMultipleTracesModal(props: MixinModalProps) {
  const { getMixinClient } = useAppStore.getState();
  const client = getMixinClient();
  console.log(props.requests);

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(async () => {
      const trace = props.requests[index].trace;
      try {
        const tx = await client.utxo.fetchTransaction(trace);
        if (tx.state !== "spent") return;
        if (index === props.requests.length - 1) {
          clearInterval(timer);
          props.onClose();
        } else setIndex((i) => i + 1);
      } catch (e) {}
    }, 1000 * 5);
    return () => clearInterval(timer);
  }, [index]);

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onClose}>
      <DialogContent className="min-w-[320px]">
        <div className="flex flex-col items-center">
          <p className="mb-4 text-center">{`Traces ${index + 1} of ${props.requests.length}`}</p>
          <div className="w-[256px] h-[256px] rounded-xl overflow-hidden">
            {<QrCode value={props.requests[index].value} />}
          </div>
          <p className="mt-4 text-center">Scanning...</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
