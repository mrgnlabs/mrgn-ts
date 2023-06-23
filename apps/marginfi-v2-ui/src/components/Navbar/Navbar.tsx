import { FC, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { NavbarCenterItem } from "./NavbarCenterItem";
import AirdropZone from "./AirdropZone";
import { WalletButton } from "./WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@mui/material";

// Firebase
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBPAKOn7YKvEHg6iXTRbyZws3G4kPhWjtQ",
  authDomain: "marginfi-dev.firebaseapp.com",
  projectId: "marginfi-dev",
  storageBucket: "marginfi-dev.appspot.com",
  messagingSenderId: "509588742572",
  appId: "1:509588742572:web:18d74a3ace2f3aa2071a09"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const getPoints = async ({ wallet }: { wallet: string | undefined }) => {
  if (!wallet) return;

  const docRef = doc(db, "points", wallet);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const pointsData = docSnap.data();
    const points = {
      owner: pointsData.owner,
      deposit_points: pointsData.total_deposit_points.toFixed(4),
      borrow_points: pointsData.total_borrow_points.toFixed(4),
      total: (pointsData.total_deposit_points + pointsData.total_borrow_points).toFixed(4)
    }
    return points;
  } else {
    // docSnap.data() will be undefined in this case
    console.log("No points record for this wallet.");
    // return a points object with all fields set to zero
    return {
      owner: wallet,
      deposit_points: 0,
      borrow_points: 0,
      total: 0
    };
  }
}

type Points = {
  owner: string;
  deposit_points: number;
  borrow_points: number;
  total: number;
} | null;


// @todo implement second pretty navbar row
const Navbar: FC = () => {
  const wallet = useWallet();
  const [points, setPoints] = useState<Points>(null);
  const [user, setUser] = useState<null | string>(null);
  console.log({ user });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('detected auth change');
      setUser(user?.uid || null);
    });

    return () => unsubscribe();

  }, [auth]);

  useEffect(() => {
    if (user && wallet.publicKey?.toBase58()) {
      const fetchData = async () => {
        console.log('fetching data');
        const pointsData = await getPoints({ wallet: wallet.publicKey?.toBase58() });
        if (pointsData) {
          setPoints(pointsData);
        }
      };

      fetchData();
    }
  }, [user, wallet.publicKey?.toBase58()]);

  return (
    <header>
      <nav className="fixed w-full top-0 h-[72px] sm:h-[64px] z-20 backdrop-blur-md">
        <div
          className="w-full top-0 flex justify-between items-center h-[72px] sm:h-[64px] text-2xl z-10"
          style={{
            border: "solid #1C2125 1px",
            padding: "0 15px",
          }}
        >
          <div className="h-full relative flex justify-start items-center z-10">
            <Link href={"/"} className="relative w-[28.02px] h-[24.81px] mr-4 z-10">
              <Image src="/marginfi_logo.png" alt="marginfi logo" fill />
            </Link>
          </div>
          <div className="absolute fixed left-0 right-0 flex justify-center items-center w-full h-full invisible lg:visible">
            <div className="h-full w-[33%] flex min-w-fit max-w-[600px] justify-center items-center">
              <Link href={"/earn"} className="h-full w-1/4 min-w-1/4 max-w-1/4 flex justify-center items-center p-0">
                <NavbarCenterItem text="Earn!" icon />
              </Link>
              <Link
                href={"https://app.marginfi.com"}
                className="h-full w-1/4 min-w-1/4 max-w-1/4 flex justify-center items-center p-0"
              >
                <NavbarCenterItem text="Lend" />
              </Link>
              <Link
                href={"https://app.marginfi.com/swap"}
                className="h-full w-1/4 min-w-1/4 max-w-1/4 flex justify-center items-center p-0"
              >
                <NavbarCenterItem text="Swap" />
              </Link>
              <Link
                href={"https://omni.marginfi.com"}
                className="h-full w-1/4 min-w-1/4 max-w-1/4 flex justify-center items-center p-0"
              >
                <NavbarCenterItem text="Omni" />
              </Link>
              {wallet.connected && process.env.NEXT_PUBLIC_MARGINFI_FEATURES_AIRDROP === "true" && <AirdropZone />}
            </div>
          </div>
          <div className="h-full flex justify-center items-center gap-4 z-10">
            {
              points &&
              <Link href={"https://marginfi.canny.io/mrgnlend"} className="hidden sm:block">
                <Button
                  className="h-full w-1/4 min-w-[140px] max-w-1/4 text-sm flex justify-center items-center normal-case rounded-2xl bg-gradient-to-r to-[#FFF3D0] from-[#C5B893] text-black px-4"
                  variant="text"
                >
                  {`🎁 ${points.total}`}
                </Button>
              </Link>
            }
            <Link href={"https://marginfi.canny.io/mrgnlend"} className="hidden sm:block">
              <Button
                className="h-full w-1/4 min-w-fit max-w-1/4 text-sm flex justify-center items-center normal-case rounded-2xl bg-gradient-to-r to-[#FFF3D0] from-[#C5B893] text-black px-4"
                variant="text"
              >
                Submit Feedback
              </Button>
            </Link>
            <WalletButton />
          </div>
        </div>
      </nav>
    </header>
  );
};

export { Navbar };
