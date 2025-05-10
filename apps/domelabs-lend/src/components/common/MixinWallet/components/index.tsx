import { Avatar, AvatarImage, AvatarFallback } from "@mrgnlabs/mrgn-ui/src/components/ui/avatar";
import { Button } from "@mrgnlabs/mrgn-ui/src/components/ui/button";
import { useCallback, useState } from "react";
import { useAppStore } from "../../../../store";
import { MixinLoginModal } from "./MixinLoginModal";

export default function MixinWallet() {
  const { user } = useAppStore((s) => ({
    user: s.user,
  }));

  const [show, setShow] = useState(false);
  const handleOpen = useCallback(() => setShow(true), [setShow]);
  const handleClose = useCallback(() => setShow(false), [setShow]);

  return (
    <div>
      {user ? (
        <div className="flex">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={user.avatar_url} alt={user.full_name} />
              <AvatarFallback>{user.full_name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span>{user.full_name}</span>
          </div>
        </div>
      ) : (
        <Button onClick={handleOpen} className="w-full">
          {/* {t('button.connect_wallet')} */}
          Connect Wallet
        </Button>
      )}
      <MixinLoginModal isOpen={show} onClose={handleClose} />
    </div>
  );
}
