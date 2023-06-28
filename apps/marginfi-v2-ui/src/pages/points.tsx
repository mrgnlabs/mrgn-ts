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
import { numeralFormatter, groupedNumberFormatterDyn } from "~/utils/formatters";
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
  const [userData, setUserData] = useState();

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
      const pointsQuery = query(pointsCollection);
      const querySnapshot = await getDocs(pointsQuery);
      const leaderboardUnsorted = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Add a total_points field to each user in the leaderboard and sort it
      const leaderboard = leaderboardUnsorted.map(userPoints => {
        return {
          ...userPoints,
          // @ts-ignore
          total_points: userPoints.total_deposit_points + userPoints.total_borrow_points
        };
      }).sort((a, b) => b.total_points - a.total_points);

      // Fetch user data
      if (user) {
        // get user referral code
        const userDoc = await getDoc(doc(db, "users", user));
        const userReferralData = userDoc.data();
        const userReferralCode = userReferralData?.referralCode || "";

        // get user points
        const userPointsDoc = await getDoc(doc(db, "points", user));
        const userPointsData = userPointsDoc.data();

        const userTotalPoints = userPointsData?.total_deposit_points + userPointsData?.total_borrow_points;
        const userLendingPoints = userPointsData?.total_activity_deposit_points;
        const userBorrowingPoints = userPointsData?.total_activity_borrow_points;
        const userReferralPoints = userPointsData?.total_referral_deposit_points + userPointsData?.total_referral_borrow_points;

        // get user rank
        const userRank = leaderboard.findIndex(user => user.id === wallet.publicKey?.toBase58()) + 1;

        // @ts-ignore
        setUserData({
          // @ts-ignore
          userTotalPoints,
          userLendingPoints,
          userBorrowingPoints,
          userReferralPoints,
          userReferralLink: userReferralCode ? `https://mfi.gg/${userReferralCode}` : '',
          userRank
        })
      }

      // @ts-ignore
      setLeaderboardData(leaderboard);
    }

    fetchData();
  }, [wallet.connected, user, wallet.publicKey]);

  return (
    <>
      <PageHeader text="leaderboard" />
      {/* <div
        className="flex flex-col items-center w-4/5 max-w-7xl gap-8 py-[32px]"
      > */}
      <div className="flex flex-col items-center w-full sm:w-4/5 max-w-7xl gap-4 py-[64px] sm:py-[32px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-2/3">
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Total Points
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                {userData && userData?.userTotalPoints > 0 ? numeralFormatter(userData?.userTotalPoints) : '-'}
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Rank
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                {`#${userData && userData?.userRank > 0 ? groupedNumberFormatterDyn.format(userData?.userRank) : '-'}`}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 w-2/3">
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Lending Points
              </Typography>
              <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
                {userData && userData?.userLendingPoints > 0 ? numeralFormatter(userData?.userLendingPoints) : '-'}
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Borrowing Points
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                {userData && userData?.userBorrowingPoints > 0 ? numeralFormatter(userData?.userBorrowingPoints) : '-'}
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Referral points
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                {userData && userData?.userReferralPoints > 0 ? numeralFormatter(userData?.userReferralPoints) : '-'}
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 justify-items-center w-2/3 md:w-1/2">
          <Button
            className="normal-case text-lg font-aeonik w-full min-h-[60px] rounded-[45px] whitespace-nowrap"
            style={{
              backgroundColor: "rgb(227, 227, 227)",
              border: "none",
              color: "black",
              zIndex: 10,
            }}
          >
            How do points work?
          </Button>
          <Button
            className="normal-case text-lg font-aeonik w-full min-h-[60px] rounded-[45px] gap-2 whitespace-nowrap"
            style={{
              backgroundColor: "rgb(227, 227, 227)",
              border: "none",
              color: "black",
              zIndex: 10,
            }}
            onClick={() => {
              if (userData?.userReferralLink) {
                navigator.clipboard.writeText(userData.userReferralLink);
              }
            }}
          >
            Copy referral link
            <FileCopyIcon />
          </Button>
        </div>
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
