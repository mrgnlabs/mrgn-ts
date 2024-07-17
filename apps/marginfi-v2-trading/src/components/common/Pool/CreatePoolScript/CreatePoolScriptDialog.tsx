import React from "react";
import ReactDOM from "react-dom";

import Confetti from "react-confetti";
import { useWindowSize } from "@uidotdev/usehooks";
import { IconPlus } from "@tabler/icons-react";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore } from "~/store";
import { cn } from "~/utils";
import { useIsMobile } from "~/hooks/useIsMobile";

import { CreatePoolSuccess } from "~/components/common/Pool/CreatePoolDialog/";
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { MultiStepToastHandle, showWarningToast } from "~/utils/toastUtils";
import { CreatePoolLoading, CreatePoolSetup, bankTokens } from "./components";

enum CreatePoolState {
  SETUP = "setup",
  LOADING = "loading",
  SUCCESS = "success",
}

type CreatePoolDialogProps = {
  trigger?: React.ReactNode;
};

export const CreatePoolScriptDialog = ({ trigger }: CreatePoolDialogProps) => {
  const [resetSearchResults, searchBanks] = useTradeStore((state) => [state.resetSearchResults, state.searchBanks]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [createPoolState, setCreatePoolState] = React.useState<CreatePoolState>(CreatePoolState.SETUP);
  const [currentIndex, setCurrentIndex] = React.useState<number>(0);

  const { width, height } = useWindowSize();
  const isMobile = useIsMobile();

  const onCompletion = async (props: {
    stableBankPk: PublicKey;
    tokenBankPk: PublicKey;
    groupPk: PublicKey;
    lutAddress: PublicKey;
  }) => {
    const multiStepToast = new MultiStepToastHandle("LUT upload", [{ label: `Uploading LUT to GCP` }]);
    multiStepToast.start();

    try {
      const lutUpdateRes = await fetch(`/api/lut`, {
        method: "POST",
        body: JSON.stringify({
          groupAddress: props.groupPk.toBase58(),
          lutAddress: props.lutAddress.toBase58(),
        }),
      });

      if (!lutUpdateRes.ok) {
        console.error("Failed to update LUT");
        throw new Error();
      }
    } catch {
      multiStepToast.setFailed("Updating LUT failed, check console and update manually");
      console.log({
        uploadLut: {
          groupAddress: props.groupPk.toBase58(),
          lutAddress: props.lutAddress.toBase58(),
        },
      });
    }

    multiStepToast.setSuccessAndNext();

    setCreatePoolState(CreatePoolState.SUCCESS);
  };

  const nextRound = () => {
    const newIndex = currentIndex + 1;

    const isFinished = bankTokens.length === newIndex;
    if (isFinished) {
      showWarningToast("All banks created! LFG");
    } else {
      setCurrentIndex((state) => state + 1);
      setCreatePoolState(CreatePoolState.SETUP);
    }
  };

  return (
    <>
      {createPoolState === CreatePoolState.SUCCESS &&
        ReactDOM.createPortal(
          <Confetti
            width={width!}
            height={height! * 2}
            recycle={false}
            opacity={0.4}
            className={cn(isMobile ? "z-[80]" : "z-[60]")}
          />,
          document.body
        )}
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) resetSearchResults();
          setIsOpen(open);
        }}
      >
        <DialogTrigger asChild>
          {trigger ? (
            trigger
          ) : (
            <Button>
              <IconPlus size={18} /> Create Pool
            </Button>
          )}
        </DialogTrigger>
        <DialogContent className="w-full space-y-4 sm:max-w-4xl md:max-w-4xl z-[70]">
          {createPoolState === CreatePoolState.SETUP && (
            <CreatePoolSetup
              currentIndex={currentIndex}
              createNext={() => setCreatePoolState(CreatePoolState.LOADING)}
            />
          )}
          {createPoolState === CreatePoolState.LOADING && (
            <CreatePoolLoading
              poolCreatedData={bankTokens[currentIndex]}
              setIsOpen={setIsOpen}
              setIsCompleted={(props) => onCompletion(props)}
            />
          )}

          {createPoolState === CreatePoolState.SUCCESS && (
            <CreatePoolSuccess
              poolCreatedData={bankTokens[currentIndex]}
              setIsOpen={setIsOpen}
              goBack={() => nextRound()}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
