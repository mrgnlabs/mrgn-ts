import { useEffect, useState } from "react";
import { useOs, useIsMobile, cn } from "@mrgnlabs/mrgn-utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { QrCode } from "~/components/Qrcode";
import { SequencerTransactionRequest } from "@mixin.dev/mixin-node-sdk";
import { ComputerSystemCallRequest } from "@mrgnlabs/mrgn-common";
import { motion, AnimatePresence } from "framer-motion";

interface MixinMultipleTracesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requests: ComputerSystemCallRequest[];
  fetchTransaction?: (transactionId: string) => Promise<SequencerTransactionRequest>;
}

const PaymentContent = ({
  paymentUrl,
  isMobile,
  isCompleted,
}: {
  paymentUrl: string;
  isMobile: boolean;
  isCompleted: boolean;
}) => {
  const handlePayClick = () => {
    window.open(paymentUrl, "_blank");
  };

  const containerSize = isMobile ? "w-[240px] h-[240px]" : "w-[280px] h-[280px]";

  return (
    <AnimatePresence mode="wait">
      {isCompleted ? (
        <motion.div
          key="success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center justify-center gap-4 py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
          >
            <CheckCircle className="w-16 h-16 text-success" />
          </motion.div>
          <motion.h3
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-xl font-semibold"
          >
            支付完成
          </motion.h3>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="text-sm text-mfi-action-box-accent-foreground"
          >
            页面即将关闭...
          </motion.p>
        </motion.div>
      ) : (
        <motion.div
          key="payment"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5 }}
          className={cn(
            "flex flex-col md:flex-row items-center md:items-start gap-8",
            isMobile ? "w-full" : "w-full max-w-[560px] mx-auto"
          )}
        >
          <div className="flex flex-col items-center gap-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={containerSize}
            >
              <QrCode value={paymentUrl} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center gap-2 text-sm text-mfi-action-box-accent-foreground"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在等待支付结果...</span>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={cn("flex flex-col justify-center gap-5", isMobile ? "w-full px-4" : "flex-1")}
          >
            <div className="space-y-2">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="text-lg font-semibold text-center md:text-left"
              >
                使用 Mixin 支付
              </motion.h3>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-sm text-mfi-action-box-accent-foreground text-center md:text-left"
              >
                点击下方按钮跳转至 Mixin 进行支付
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <Button
                onClick={handlePayClick}
                className={cn("w-full", !isMobile && "max-w-[200px]")}
                variant="default"
                size="lg"
              >
                前往支付
              </Button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const MixinMultipleTracesModal = ({
  open,
  onOpenChange,
  requests,
  fetchTransaction,
}: MixinMultipleTracesModalProps) => {
  const { isIOS, isPWA } = useOs();
  const isMobile = useIsMobile();
  const shouldShowDialog = !isMobile || (isIOS && isPWA);
  const [index, setIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onOpenChange(false);
      setIsClosing(false);
      setIsCompleted(false);
    }, 800);
  };

  useEffect(() => {
    if (!fetchTransaction) return;
    const timer = setInterval(async () => {
      const trace = requests[index].trace;
      try {
        const tx = await fetchTransaction(trace);
        if (tx.state !== "spent") return;

        if (index === requests.length - 1) {
          setIsCompleted(true);
          clearInterval(timer);
          // 延迟关闭时间延长到 4 秒，给动画更多时间
          setTimeout(() => {
            handleClose();
          }, 4000);
        } else {
          setIndex((i) => i + 1);
        }
      } catch (e) {}
    }, 1000 * 5);
    return () => clearInterval(timer);
  }, [index]);

  if (shouldShowDialog) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent
          className={cn(
            "p-8 bg-mfi-action-box-background",
            isIOS && isPWA && "justify-start",
            isMobile ? "max-w-[95vw]" : "max-w-[600px]",
            isClosing && "animate-fadeOut"
          )}
        >
          <DialogHeader className="relative mb-6">
            <DialogTitle className="text-center text-xl font-semibold">Mixin 支付</DialogTitle>
          </DialogHeader>
          <PaymentContent paymentUrl={requests[index].value} isMobile={isMobile} isCompleted={isCompleted} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className={cn("h-[80vh] bg-mfi-action-box-background pb-40", isClosing && "animate-slideDown")}
      >
        <div className="flex flex-col h-full">
          <SheetHeader className="relative border-b p-4">
            <SheetTitle className="text-center text-xl font-semibold">Mixin 支付</SheetTitle>
            <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </SheetHeader>
          <div className="flex-1 overflow-auto py-8">
            <PaymentContent paymentUrl={requests[index].value} isMobile={true} isCompleted={isCompleted} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export { MixinMultipleTracesModal };
