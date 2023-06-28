import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip, Typography, Card, CardContent } from '@mui/material';
import { collection, getDocs, query, orderBy, getDoc, doc } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { initializeApp } from "firebase/app";
import { useWallet } from "@solana/wallet-adapter-react";
import { FC, useEffect, useState } from 'react';
import { PageHeader } from "~/components/PageHeader";
import { groupedNumberFormatter } from '~/utils/formatters';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import FileCopyIcon from '@mui/icons-material/FileCopy';
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

const Points: FC = () => {
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
      <div
        className="flex flex-col items-center w-4/5 max-w-7xl gap-8 py-[32px]"
      >
        <div className="min-w-[600px] w-2/3 grid grid-rows-3 gap-4">
          <div className="grid grid-cols-2 gap-4 row-start-1 row-end-2">
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                  Total Points
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                  420
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                  Rank
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                  #69
                </Typography>
              </CardContent>
            </Card>
          </div>
          <div className="grid grid-cols-3 gap-4 row-start-2 row-end-3">
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                  Lending Points
                </Typography>
                <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
                  123
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                  Borrowing Points
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                  321
                </Typography>
              </CardContent>
            </Card>
            <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
              <CardContent>
                <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                  Points from referrals
                </Typography>
                <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                  101
                </Typography>
              </CardContent>
            </Card>
          </div>
          <div className="grid w-4/5 grid-cols-2 gap-4 row-start-3 row-end-4 justify-self-center">
            <div className="w-full flex justify-center items-center h-24">
              <Button
                className="normal-case text-xl font-aeonik min-w-[267px] min-h-[60px] rounded-[45px]"
                style={{
                  backgroundColor: "rgb(227, 227, 227)",
                  border: "none",
                  color: "black",
                  zIndex: 10,
                }}
              >
                How do points work?
              </Button>
            </div>

            <div className="w-full flex justify-center items-center h-24">
              <Button
                className="normal-case text-xl font-aeonik min-w-[267px] min-h-[60px] rounded-[45px] gap-2"
                style={{
                  backgroundColor: "rgb(227, 227, 227)",
                  border: "none",
                  color: "black",
                  zIndex: 10,
                }}
              >
                Copy referral link
                <FileCopyIcon />
              </Button>
            </div>
          </div>
        </div>
        {/* {
          referralLink &&
          <Link href={referralLink} className="text-2xl glow-on-hover">
            {`wield your code: ${referralLink}`}
          </Link>
        } */}
        <TableContainer
          component={Paper} className="h-full min-w-full bg-[#131619] border border-[#1E2122] rounded-2xl"
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
      </div>
    </>
  );
};

export default Points;
