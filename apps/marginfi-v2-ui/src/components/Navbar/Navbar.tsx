import { FC, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import AirdropZone from "./AirdropZone";
import { WalletButton } from "./WalletButton";
import { useWallet } from "@solana/wallet-adapter-react";
import { groupedNumberFormatterDyn } from "~/utils/formatters";

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
      total: (pointsData.total_deposit_points + pointsData.total_borrow_points)
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
      <nav
        className="fixed w-full top-0 h-[64px] z-20 backdrop-blur-md"
      >
        <div className="w-full top-0 flex justify-between items-center h-16 text-2xl z-10 border-b-[0.5px] border-[#1C2125] px-4">
          <div
            className="h-full w-1/2 flex justify-start items-center z-10 text-base font-[300] gap-4 lg:gap-8"
          >
            <Link href={"https://app.marginfi.com"} className="h-[35.025px] w-[31.0125px] min-h-[35.025px] min-w-[31.0125px] flex justify-center items-center">
              <Image src="/marginfi_logo.png" alt="marginfi logo" height={35.025} width={31.0125} />
            </Link>

            <Link href={"/"} className="glow-on-hover hidden md:block">
              lend
            </Link>

            <Link href={"/swap"} className="glow-on-hover">
              swap
            </Link>

            <Link href={"/earn"} className="glow-on-hover">
              earn
            </Link>

            <Link href={"https://omni.marginfi.com"} className="glow-on-hover">
              omni
            </Link>

            <Link href={"/points"} className="glow-on-hover hidden md:block">
              points
            </Link>

            {process.env.NEXT_PUBLIC_MARGINFI_FEATURES_AIRDROP === "true" && wallet.connected && <AirdropZone />}
          </div>

          <div
            className="h-full w-1/2 flex justify-end items-center z-10 text-base font-[300] gap-4 lg:gap-8"
          >

            {
              <Link href={"/"} className="glow whitespace-nowrap">
                {`${(wallet.connected && user && points && points.total && points.total > 0)
                  ?
                  groupedNumberFormatterDyn.format(Math.round(points.total))
                  :
                  0
                  } points`}
              </Link>
            }

            <Link href={"https://marginfi.canny.io/mrgnlend"} className="glow-on-hover whitespace-nowrap hidden md:block">
              build marginfi
            </Link>

            <WalletButton />
          </div>
        </div>
      </nav>
    </header >
  );
};

export { Navbar };
