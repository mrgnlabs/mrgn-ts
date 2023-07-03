import { Fragment } from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Typography, Card, CardContent, Skeleton } from '@mui/material';
import { collection, doc, query, orderBy, startAfter, limit, getDocs, getDoc } from "firebase/firestore";
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
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { styled } from "@mui/material/styles";
import Image from "next/image";

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

type UserData = {
  userTotalPoints?: number,
  userLendingPoints?: number,
  userBorrowingPoints?: number,
  userReferralPoints?: number,
  userReferralLink?: string,
  userRank?: number
};

type LeaderboardRow = {
  id: string;
  total_activity_deposit_points: number;
  total_activity_borrow_points: number;
  total_referral_deposit_points: number;
  total_referral_borrow_points: number;
  total_deposit_points: number;
  total_borrow_points: number;
};

const HtmlTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }: { theme: any; }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: "rgb(227, 227, 227)",
    color: "rgba(0, 0, 0, 0.87)",
    maxWidth: 220,
    fontSize: theme.typography.pxToRem(12),
    border: "1px solid #dadde9",
  },
}));

const Points: FC = () => {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardRow[]>([]);
  const wallet = useWallet();
  const [user, setUser] = useState<null | string>(null);
  const [userData, setUserData] = useState<UserData>();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user?.uid || null);
    });

    return () => unsubscribe();

  }, [auth, wallet.connected, wallet.publicKey]);

  useEffect(() => {
    const fetchData = async (lastDoc = null) => {
      const pageSize = 10;
      const pointsCollection = collection(db, 'points');
      let pointsQuery;

      // If we have a last document, set the cursor to start after it
      if (lastDoc) {
        pointsQuery = query(pointsCollection, orderBy("total_points", "desc"), startAfter(lastDoc), limit(pageSize));
      } else {
        pointsQuery = query(pointsCollection, orderBy("total_points", "desc"), limit(pageSize));
      }

      const querySnapshot = await getDocs(pointsQuery);
      const leaderboard = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // @ts-ignore
      setLeaderboardData(oldData => {
        const dataMap = new Map();
        [...oldData, ...leaderboard].forEach(item => {
          dataMap.set(item.id, item);
        });
        return Array.from(dataMap.values());
      });

      // If documents are returned, set the last one as the cursor for next pagination
      if (querySnapshot.docs.length > 0) {
        // @ts-ignore
        fetchData(querySnapshot.docs[querySnapshot.docs.length - 1]);
      }
    };

    fetchData();
  }, [wallet.connected, user, wallet.publicKey]); // Dependency array to re-fetch when these variables change

  useEffect(() => {
    const fetchuserData = async () => {
      // Fetch user data
      if (user && leaderboardData.length > 0) {
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
        const userRank = leaderboardData.findIndex(user => user.id === wallet.publicKey?.toBase58()) + 1;

        setUserData({
          userTotalPoints,
          userLendingPoints,
          userBorrowingPoints,
          userReferralPoints,
          userReferralLink: userReferralCode ? `https://mfi.gg/refer/${userReferralCode}` : '',
          userRank
        });
      }
    }

    fetchuserData()

  }, [user, JSON.stringify(leaderboardData)])

  return (
    <>
      <PageHeader text="points" />
      <div className="flex flex-col items-center w-full sm:w-4/5 max-w-7xl gap-5 py-[64px] sm:py-[32px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 w-2/3">
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                Total Points
                <div className="self-center">
                  <HtmlTooltip
                    title={
                      <Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Points
                        </Typography>
                        Points refresh every 24 hours.
                      </Fragment>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                {
                  userData?.userTotalPoints && userData.userTotalPoints > 0 ?
                    numeralFormatter(userData.userTotalPoints) :
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      className="w-1/3 rounded-md top-[4px]"
                    />
                }
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base" gutterBottom>
                Global Rank
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-3xl" component="div">
                {userData?.userRank && userData?.userRank > 0 ?
                  `#${groupedNumberFormatterDyn.format(userData?.userRank)}` :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
                }
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 w-2/3">
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                Lending Points
                <div className="self-center">
                  <HtmlTooltip
                    title={
                      <Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Lending
                        </Typography>
                        Lending earns 1 point per dollar lent per day.
                      </Fragment>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
              </Typography>
              <Typography color="#fff" component="div" className="font-aeonik font-[500] text-2xl">
                {
                  userData?.userLendingPoints && userData?.userLendingPoints > 0 ?
                    numeralFormatter(userData?.userLendingPoints) :
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      className="w-1/3 rounded-md top-[4px]"
                    />
                }
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                Borrowing Points
                <div className="self-center">
                  <HtmlTooltip
                    title={
                      <Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Borrowing
                        </Typography>
                        Borrowing earns 4 points per dollar borrowed per day.
                      </Fragment>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                {userData?.userBorrowingPoints && userData?.userBorrowingPoints > 0 ?
                  numeralFormatter(userData?.userBorrowingPoints) :
                  <Skeleton
                    variant="rectangular"
                    animation="wave"
                    className="w-1/3 rounded-md top-[4px]"
                  />
                }
              </Typography>
            </CardContent>
          </Card>
          <Card className="bg-[#131619] h-full h-24 rounded-xl" elevation={0}>
            <CardContent>
              <Typography color="#868E95" className="font-aeonik font-[300] text-base flex gap-1" gutterBottom>
                Referral Points
                <div className="self-center">
                  <HtmlTooltip
                    title={
                      <Fragment>
                        <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                          Earn more with friends
                        </Typography>
                        Earn 10% of the points any user you refer earns.
                      </Fragment>
                    }
                    placement="top"
                  >
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </HtmlTooltip>
                </div>
              </Typography>
              <Typography color="#fff" className="font-aeonik font-[500] text-2xl" component="div">
                {userData?.userReferralPoints && userData?.userReferralPoints > 0 ? numeralFormatter(userData?.userReferralPoints) :
                  userData?.userReferralPoints === 0 ?
                    '-'
                    :
                    <Skeleton
                      variant="rectangular"
                      animation="wave"
                      className="w-1/3 rounded-md top-[4px]"
                    />
                }
              </Typography>
            </CardContent>
          </Card>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 justify-items-center w-2/3 md:w-1/2">
          <Button
            className="normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] whitespace-nowrap"
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
            className="normal-case text-lg font-aeonik w-[92%] min-h-[60px] rounded-[45px] gap-2 whitespace-nowrap"
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
        <div className="w-4/5 text-center text-[#868E95] text-xs flex justify-center gap-1">
          <div>We reserve the right to update point calculations at any time.</div>
          <div><Link href="/terms/points" style={{ textDecoration: 'underline' }}>Terms.</Link></div>
        </div>

        <TableContainer
          component={Paper} className="h-full w-4/5 sm:w-full bg-[#131619] rounded-xl overflow-x-auto"
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell align="center" className="text-white text-base font-aeonik border-none pl-2" style={{ fontWeight: 500 }}>Rank</TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" style={{ fontWeight: 500 }}>User</TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" align="right" style={{ fontWeight: 500 }}>Lending Points</TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" align="right" style={{ fontWeight: 500 }}>Borrowing Points</TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" align="right" style={{ fontWeight: 500 }}>Referral Points</TableCell>
                <TableCell className="text-white text-base font-aeonik border-none" align="right" style={{ fontWeight: 500 }}>Total Points</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaderboardData.map((row: LeaderboardRow, index: number) => (
                <TableRow key={row.id} className={`${row.id === user ? 'glow' : ''}`}>
                  <TableCell align="center" className={`${index <= 2 ? 'text-2xl' : 'text-base'} border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </TableCell>
                  <TableCell className={`text-base border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`} style={{ fontWeight: 400 }}>
                    <a href={`https://solscan.io/account/${row.id}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }} className="glow-on-hover">
                      {`${row.id.slice(0, 5)}...${row.id.slice(-5)}`}
                      <style jsx>{`
                        a:hover {
                          text-decoration: underline;
                        }
                      `}</style>
                    </a>
                  </TableCell>
                  <TableCell align="right" className={`text-base border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`} style={{ fontWeight: 400 }}>{groupedNumberFormatterDyn.format(Math.round(row.total_activity_deposit_points))}</TableCell>
                  <TableCell align="right" className={`text-base border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`} style={{ fontWeight: 400 }}>{groupedNumberFormatterDyn.format(Math.round(row.total_activity_borrow_points))}</TableCell>
                  <TableCell align="right" className={`text-base border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`} style={{ fontWeight: 400 }}>{groupedNumberFormatterDyn.format(Math.round(row.total_referral_deposit_points + row.total_referral_borrow_points))}</TableCell>
                  <TableCell align="right" className={`text-base border-none font-aeonik ${row.id === user ? 'text-[#DCE85D]' : 'text-white'}`} style={{ fontWeight: 400 }}>{groupedNumberFormatterDyn.format(Math.round(row.total_deposit_points + row.total_borrow_points))}</TableCell>
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
