import React, { FC, useEffect, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Button, Card, CardContent, TextField, Checkbox } from "@mui/material";
import { useConnection } from "~/hooks/useConnection";
import { grey } from "@mui/material/colors";
import { toast } from "react-toastify";

import { firebaseApi } from "@mrgnlabs/marginfi-v2-ui-state";

import { useWalletContext } from "~/hooks/useWalletContext";
import { MrgnTooltip } from "~/components/common/MrgnTooltip";
import { WalletButton } from "~/components/common/Wallet";

interface PointsSignUpProps {
  referralCode?: string;
}

export const PointsSignUp: FC<PointsSignUpProps> = ({ referralCode }) => {
  const { connection } = useConnection();
  const { wallet, connected } = useWalletContext();
  const [manualCode, setManualCode] = useState("");
  const [useAuthTx, setUseAuthTx] = useState(false);
  const [useManualCode, setUseManualCode] = useState(false);

  const finalReferralCode = useMemo(
    () => (useManualCode ? manualCode : referralCode),
    [useManualCode, manualCode, referralCode]
  );

  useEffect(() => {
    if (manualCode.length > 0) {
      setUseManualCode((current) => current || true);
    }
  }, [manualCode]);

  const signup = useCallback(async () => {
    if (!wallet) {
      toast.error("Wallet not connected!");
      return;
    }
    toast.info("Logging in...");
    try {
      await firebaseApi.signup(wallet.publicKey.toBase58(), finalReferralCode);
      toast.success("Signed up successfully");
    } catch (signupError: any) {
      toast.error(signupError.message);
    }
  }, [finalReferralCode, wallet]);

  return (
    <Card className="max-w-[800px] mx-auto w-full bg-[#1A1F22] h-full h-24 rounded-xl" elevation={0}>
      <CardContent>
        <div className="w-full flex flex-col justify-evenly items-center p-2 text-base text-white font-aeonik font-[400] rounded-xl text-center">
          <div>
            <span className="text-2xl font-[500]">Access upgraded features</span>
            <br />
            <br />
            Prove you own this wallet by signing a message.
            <br />
            Optionally enter a referral code below.
          </div>
          <div className="w-full flex justify-center items-center">
            {connected ? (
              <div>
                <TextField
                  size="medium"
                  variant="outlined"
                  value={finalReferralCode}
                  InputProps={{
                    className: "font-aeonik text-[#e1e1e1] text-center border border-[#4E5257] h-11 mt-[20px]",
                  }}
                  inputProps={{ className: "text-center" }}
                  onChange={(event) => {
                    setManualCode(event.target.value);
                  }}
                />
                <div
                  className="flex justify-center items-center cursor-pointer"
                  onClick={() => setUseAuthTx((current) => !current)}
                >
                  <Checkbox
                    checked={useAuthTx}
                    sx={{
                      color: grey[800],
                      "&.Mui-checked": {
                        color: grey[600],
                      },
                    }}
                  />
                  <span className="mr-[8px]">Use tx signing</span>
                  <MrgnTooltip
                    title={
                      <>
                        <div className="flex flex-col gap-2 pb-2">
                          Certain hardware wallet versions do not support memo signing.
                        </div>
                        <div className="flex flex-col gap-2 pb-2">
                          Use this option if you are unable to proceed with memo signing. It is free as well and will
                          not involve the network.
                        </div>
                      </>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </MrgnTooltip>
                </div>
                <Button
                  size="large"
                  className={`bg-white text-black normal-case text-[10px] sm:text-sm mx-2 mt-[20px] sm:mx-0 w-14 sm:w-32 h-11 rounded-md max-w-[115px]`}
                  style={{
                    fontWeight: 300,
                  }}
                  onClick={signup}
                >
                  Signup
                </Button>
              </div>
            ) : (
              <WalletButton />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
