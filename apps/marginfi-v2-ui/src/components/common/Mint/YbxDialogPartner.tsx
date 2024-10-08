import React from "react";

import { IconCheck } from "@tabler/icons-react";

import { MintPageState, signUpYbx } from "~/utils";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/components/ui/dialog";
import { IconYBX } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { DialogDescription, DialogProps } from "@radix-ui/react-dialog";
import { Input } from "~/components/ui/input";

interface YbxDialogProps extends DialogProps {
  mintPageState: MintPageState;
  onHandleChangeMintPage: (state: MintPageState) => void;
  onClose: () => void;
}

export const YbxDialogPartner: React.FC<YbxDialogProps> = ({
  mintPageState,
  onHandleChangeMintPage,
  onClose,
  ...props
}) => {
  const emailInputRef = React.useRef<HTMLInputElement>(null);

  const signUpPartner = React.useCallback(async () => {
    try {
      await signUpYbx(emailInputRef, "partner");
      onHandleChangeMintPage(MintPageState.SUCCESS);
    } catch (error) {
      onHandleChangeMintPage(MintPageState.ERROR);
      return;
    }
  }, [onHandleChangeMintPage, emailInputRef]);

  return (
    <Dialog {...props}>
      <DialogContent className="md:flex">
        <DialogHeader>
          <IconYBX size={48} />
          <DialogTitle className="text-2xl">YBX Launch Partner Form</DialogTitle>
          <DialogDescription>Sign up to become a YBX launch partner.</DialogDescription>
        </DialogHeader>

        {mintPageState === MintPageState.SUCCESS && (
          <div className="flex flex-col items-center gap-4">
            <p className="flex items-center justify-center gap-2">
              <IconCheck size={18} className="text-success" /> You are signed up!
            </p>
          </div>
        )}

        {(mintPageState === MintPageState.DEFAULT || mintPageState === MintPageState.ERROR) && (
          <>
            <form
              className="w-full px-8 mb-4"
              onSubmit={(e) => {
                e.preventDefault();
                signUpPartner();
              }}
            >
              <div className="flex items-center w-full gap-2">
                <Input ref={emailInputRef} type="email" placeholder="example@example.com" className="w-full" required />
                <Button type="submit">Sign Up</Button>
              </div>
            </form>

            {mintPageState === MintPageState.ERROR && (
              <p className="text-destructive-foreground text-sm text-center">Error signing up, please try again.</p>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
