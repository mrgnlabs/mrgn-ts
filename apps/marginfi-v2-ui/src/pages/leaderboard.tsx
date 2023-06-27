import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Typography } from '@mui/material';
import { collection, getDocs, query, orderBy, getDoc, doc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from 'react';
import { PageHeader } from "~/components/PageHeader";
import { groupedNumberFormatter } from '~/utils/formatters';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import Link from "next/link";

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

const Leaderboard: FC = () => {
  const [leaderboardData, setLeaderboardData] = useState([]);
  const wallet = useWallet();
  const [user, setUser] = useState<null | string>(null);
  const [referralLink, setReferralLink] = useState();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('detected auth change');
      setUser(user?.uid || null);
    });

    return () => unsubscribe();

  }, [auth]);

  useEffect(() => {
    const fetchData = async () => {
      const pointsCollection = collection(db, 'points');
      const pointsQuery = query(pointsCollection, orderBy("total_deposit_points", "desc"));
      const querySnapshot = await getDocs(pointsQuery);
      const leaderboard = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fetch referral code only for the current user
      // const currentUser = leaderboard.find(user => user.owner === wallet.publicKey?.toBase58());
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user));
        const userReferralData = userDoc.data();
        const referralCode = userReferralData?.referralCode || "";
        if (referralCode) {
          setReferralLink(
            `https://mfi.gg/${referralCode}`
          )
        }
      }

      setLeaderboardData(leaderboard);
    }

    fetchData();
  }, [wallet.connected]);

  return (
    <>
      <PageHeader text="leaderboard" />
      <Box
        className="flex flex-col items-center w-4/5 max-w-7xl gap-8 py-[64px]"
      >
        {
          referralLink &&
          <Link href={referralLink} className="text-2xl glow-on-hover">
            {`wield your code: ${referralLink}`}
          </Link>
        }
        <TableContainer
          component={Paper} className="h-full min-w-full bg-[#0D0F11] border border-[#1E2122] rounded-2xl"
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell className="text-white font-aeonik border-none" style={{ fontWeight: 300 }}>Wallet</TableCell>
                <TableCell className="text-white font-aeonik border-none" align="right" style={{ fontWeight: 300 }}>Activity Points</TableCell>
                <TableCell className="text-white font-aeonik border-none" align="right" style={{ fontWeight: 300 }}>Referral Points</TableCell>
                <TableCell className="text-white font-aeonik border-none" align="right" style={{ fontWeight: 300 }}>Total Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboardData.map((row) => (
                <TableRow key={row.id}>
                  <TableCell component="th" scope="row" className="text-white border-none font-aeonik px-2" style={{ fontWeight: 300 }}>{row.id}</TableCell>
                  <TableCell align="right" className="text-white border-none font-aeonik px-2" style={{ fontWeight: 300 }}>{groupedNumberFormatter.format(Math.round(row.total_activity_deposit_points) + Math.round(row.total_activity_borrow_points)).replace(/\.00$/, '')}</TableCell>
                  <TableCell align="right" className="text-white border-none font-aeonik px-2" style={{ fontWeight: 300 }}>{groupedNumberFormatter.format(Math.round(row.total_referral_deposit_points) + Math.round(row.total_referral_borrow_points)).replace(/\.00$/, '')}</TableCell>
                  <TableCell align="right" className="text-white border-none font-aeonik px-2" style={{ fontWeight: 300 }}>{groupedNumberFormatter.format(Math.round(row.total_deposit_points) + Math.round(row.total_borrow_points)).replace(/\.00$/, '')}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </>
  );
};

export default Leaderboard;
