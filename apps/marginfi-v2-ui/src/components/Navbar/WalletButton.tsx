import dynamic from "next/dynamic";
import { FC, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useRouter } from 'next/router';
import { v4 as uuidv4 } from "uuid";
import { getAuth, signOut, signInWithCustomToken } from "firebase/auth";
import { SigningDialogBox } from './SigningDialogBox';
import { onAuthStateChanged } from "firebase/auth";
import { User } from "firebase/auth";

const WalletMultiButtonDynamic = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const WalletButton: FC = () => {
  const [signingDialogBoxOpen, setSigningDialogBoxOpen] = useState(false)
  const [userLoaded, setUserLoaded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const wallet = useWallet();
  const auth = getAuth();
  const router = useRouter();
  const { referralCode } = router.query;

  console.log({
    auth: auth,
    user: auth.currentUser,
    uid: auth?.currentUser?.uid,
  })

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
    } else if (userLoaded && wallet && wallet.connected && wallet.publicKey && (!auth.currentUser || wallet.publicKey.toBase58() != auth.currentUser.uid)) {

      setSigningDialogBoxOpen(true);

      const uuid = uuidv4();
      const encodedMessage = new TextEncoder().encode(uuid);

      //@ts-ignore
      wallet.signMessage(encodedMessage)
        .then((signature) => {
          const base64Signature = Buffer.from(signature).toString('base64');
          return fetch('/api/authUser', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              publicKey: wallet?.publicKey?.toBase58(),
              signature: base64Signature,
              uuid,
              referralCode
            }),
          });
        })
        .then(response => response.json())
        .then(data => {
          console.log(data);
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
  }, [wallet.connected]);

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
