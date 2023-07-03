import dynamic from "next/dynamic";
import { FC, useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from "uuid";
import { getAuth, signOut, signInWithCustomToken } from "firebase/auth";
import { SigningDialogBox } from './SigningDialogBox';
import { onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";
import { createMemoInstruction } from "@mrgnlabs/mrgn-common";
import { PublicKey, Transaction } from "@solana/web3.js";
import { AuthData } from "~/pages/api/authUser";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const [signingDialogBoxOpen, setSigningDialogBoxOpen] = useState(false)
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const { connection } = useConnection();

  const wallet = useWallet();
  const auth = getAuth();
  const router = useRouter();
  const { referralCode } = router.query;

  // console.log({
  //   auth: auth,
  //   user: auth.currentUser,
  //   uid: auth?.currentUser?.uid,

  //   userLoaded: userLoaded,
  //   wallet: wallet,
  //   connected: wallet.connected,
  //   publicKey: wallet.publicKey?.toBase58(),

  //   full_check: userLoaded &&
  //     wallet &&
  //     wallet.connected &&
  //     wallet.publicKey &&
  //     (!auth.currentUser || wallet.publicKey.toBase58() != auth.currentUser.uid),

  //   final_check: (!auth.currentUser || wallet?.publicKey.toBase58() != auth.currentUser.uid)
  // })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser); // Store the current user, whether it's null or an actual user
      setUserLoaded(true); // Indicate that the user loading process is complete
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, [auth]);

  useEffect(() => {
    if (!wallet.connected && !wallet.autoConnect) {
      signOut(auth)
        .then(() => {
          console.log("Signed user out.");
        })
        .catch((error) => {
          console.log("Error signing out:", error);
        });
    } else if (
      userLoaded &&
      wallet &&
      wallet.connected &&
      wallet.publicKey &&
      (!auth.currentUser || wallet.publicKey.toBase58() != auth.currentUser.uid)) {

      setSigningDialogBoxOpen(true);

      const uuid = uuidv4();

      if (referralCode !== undefined && typeof referralCode !== 'string') {
        console.error("Invalid referral code provided.");
        return;
      }

      // "Container" tx for the user metadata
      connection
        .getLatestBlockhash()
        .then((latestBlockhash) => {
          const userPublicKey = wallet.publicKey as PublicKey; // help the shitty type inference from else if clause
          const authData: AuthData = {
            uuid,
            referralCode,
          };
          const authDataStr = JSON.stringify(authData);
          const authDummyTx = new Transaction().add(createMemoInstruction(authDataStr, [userPublicKey]));
          authDummyTx.feePayer = userPublicKey;
          authDummyTx.recentBlockhash = latestBlockhash.blockhash;
          authDummyTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;

          //@ts-ignore
          return wallet.signTransaction(authDummyTx);
        })
        .then((signedAuthDummyTx) => {
          let signedData = signedAuthDummyTx.serialize().toString("base64");

          return fetch("/api/authUser", {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ signedData })
          });
        })
        .then(response => response.json())
        .then(data => {
          // Now that we have the custom token, use it to sign in
          if (data.token) {
            signInWithCustomToken(auth, data.token)
              .then(() => {
                console.log("Signed user in.");
              })
              .catch((error) => {
                console.error("Error signing in with custom token: ", error);
                if (error.code === 'auth/network-request-failed') {
                  // @todo need to give user better experience here
                  console.log("It appears there was a network error. Please check your internet connection and try again. If the problem persists, please try again later.");
                } else {
                  console.log("An error occurred while signing in. Please try again later.");
                }
              });
          }
        })
        .catch(error => {
          console.error('Error:', error);
          // If the user chose not to sign the message, sign them out
          if (error.message.includes('User denied signing the message.')) {
            signOut(auth)
              .then(() => {
                console.log("Signed user out due to error.");
              })
              .catch((signOutError) => {
                console.log("Error signing out due to error:", signOutError);
              });
          }
        });
    }
  }, [wallet.connected, wallet.publicKey, auth, referralCode, userLoaded, wallet]);

  return (
    <div>
      <WalletMultiButtonDynamic
        className={`${wallet.connected ? "glow-on-hover" : "glow"} bg-transparent px-0 font-aeonik font-[500]`}
      >
        {!wallet.connected && "CONNECT"}
      </WalletMultiButtonDynamic>
      <SigningDialogBox open={signingDialogBoxOpen} setOpen={setSigningDialogBoxOpen} />
    </div>
  );
};

export { WalletButton };
